// Fast drop-in for csv-reader 1.0.0: identical answers, single regex scan per
// field segment instead of the reference's one-character-at-a-time loop.
// ended: 0 = comma, 1 = line break, 2 = end of text.

const RE_U = /[,\r\n]/g; // unquoted field: next comma, CR or LF
const RE_Q = /["\r\n]/g; // quoted field: next quote, CR or LF

/** csv-reader 1.0.0's answer for one case's input. */
export function run(input) {
  const text = typeof input.text === 'string' ? input.text : String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  const n = text.length;
  let pos = 0;
  let line = 1;
  if (n > 0 && text.charCodeAt(0) === 0xFEFF) pos = 1;

  while (true) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) { pos += 1; line += 1; }
      else if (c === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) { pos += 2; line += 1; }
      else break;
    }
    if (pos >= n) break;

    const recordLine = line;
    const recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted = false;
    let ended = 0;
    do {
      quoted = text.charCodeAt(pos) === 34;
      let fieldValue;
      let uInit = null; // non-null: read the field as unquoted from uStart with this initial value
      let uStart = pos;
      let uJunk = false;
      if (quoted) {
        const open = pos;
        const openLine = line;
        let value = null;
        let cur = pos + 1;
        let closePos = -1;
        while (closePos === -1) {
          RE_Q.lastIndex = cur;
          const m = RE_Q.exec(text);
          if (m === null) {
            // The quote never closes: literal character, text after it read again as unquoted.
            pos = open + 1;
            line = openLine;
            errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
            uInit = '"';
            uStart = pos;
            break;
          }
          const idx = m.index;
          if (m[0] === '"') {
            if (idx + 1 < n && text.charCodeAt(idx + 1) === 34) {
              value = value === null ? text.slice(cur, idx) + '"' : value + text.slice(cur, idx) + '"';
              cur = idx + 2;
              continue;
            }
            value = value === null ? text.slice(cur, idx) : value + text.slice(cur, idx);
            closePos = idx + 1;
          } else {
            // CR or LF inside quotes: one LF in the value, line counted.
            value = value === null ? text.slice(cur, idx) + '\n' : value + text.slice(cur, idx) + '\n';
            line += 1;
            cur = idx + (m[0] === '\r' && idx + 1 < n && text.charCodeAt(idx + 1) === 10 ? 2 : 1);
          }
        }
        if (uInit === null) {
          pos = closePos;
          if (pos >= n) { fieldValue = value; ended = 2; }
          else {
            const c = text.charCodeAt(pos);
            if (c === 44) { pos += 1; fieldValue = value; ended = 0; }
            else if (c === 10) { pos += 1; line += 1; fieldValue = value; ended = 1; }
            else if (c === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) { pos += 2; line += 1; fieldValue = value; ended = 1; }
            else { uInit = value; uStart = pos; uJunk = true; }
          }
        }
      } else {
        uInit = '';
        uStart = pos;
      }
      if (uInit !== null) {
        // Unquoted read from uStart, initial value uInit ('' fresh, '"' unterminated, quoted value junk).
        let value = uInit;
        let fstart = uStart;
        let added = 0;
        let valU = value;
        let endedU = 2;
        pos = uStart;
        while (true) {
          RE_U.lastIndex = pos;
          const m = RE_U.exec(text);
          if (m === null) {
            valU = value + text.slice(fstart);
            added += n - fstart;
            pos = n;
            endedU = 2;
            break;
          }
          const idx = m.index;
          if (m[0] === ',') {
            valU = value + text.slice(fstart, idx);
            added += idx - fstart;
            pos = idx + 1;
            endedU = 0;
            break;
          }
          if (m[0] === '\n') {
            valU = value + text.slice(fstart, idx);
            added += idx - fstart;
            pos = idx + 1;
            line += 1;
            endedU = 1;
            break;
          }
          // CR: CRLF ends the line, a lone CR is dropped (stray_cr) and the field goes on.
          if (idx + 1 < n && text.charCodeAt(idx + 1) === 10) {
            valU = value + text.slice(fstart, idx);
            added += idx - fstart;
            pos = idx + 2;
            line += 1;
            endedU = 1;
            break;
          }
          errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
          value = value + text.slice(fstart, idx);
          added += idx - fstart;
          pos = idx + 1;
          fstart = pos;
        }
        if (uJunk && added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
        fieldValue = valU;
        ended = endedU;
      }
      fields.push(fieldValue);
    } while (ended === 0);

    // A line that held only stray CRs is left with no characters: no record (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
