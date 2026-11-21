# CSV Reader Speed — a faster drop-in for csv-reader 1.0.0

[![make.fun](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121)

[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/faridhasyim99/csv-reader-speed-01-run-20261121/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121)

[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/faridhasyim99/csv-reader-speed-01-run-20261121/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121)

A faster drop-in for make.fun's own csv-reader 1.0.0 — an entry for the
[make.fun bounty csv-reader-speed-01-run-20261121](https://make.fun/bounty/csv-reader-speed-01-run-20261121)
($100, 10 places). `solve.js` (plain JavaScript, no dependencies) reads
broken CSV files exactly the way csv-reader 1.0.0 does — same columns, rows
and errors on every case — but with one regex scan per field segment instead
of one character at a time.

## How it works

- Unquoted fields: one regex scan finds the next comma, CR or LF; the field
  is a single slice. A lone CR is dropped with a `stray_cr` error and the
  field goes on.
- Quoted fields: one regex scan finds the next quote, CR or LF; `""` inside
  is one quote, CR/LF inside is one LF, and characters after the closing
  quote are appended as they stand (`quote_junk`). A quote that never closes
  is a literal character and the text after it is read again as unquoted
  (`unterminated_quote`).
- Records are padded (`short_row`) or cut (`long_row`) to the first record's
  width, exactly as the reference does; a line left with no characters is no
  record.

## Validation (practice set, 6 cases, ~10.5 MB of CSV)

- Answers identical to csv-reader 1.0.0 on all 6 practice cases, on 20,098
  fuzz cases and on 12 freshly generated files from the competition's own
  generator.
- Speed on the practice set (trimmed mean of 9 runs, this machine):
  ~0.20 s against the reference's ~1.04 s — about 5.1x faster.
