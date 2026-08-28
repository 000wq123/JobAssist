# Third-Party Notices

JobAssist includes template layouts adapted from permissively licensed
open-source projects. This file records provenance for every adaptation, as
required by the template registry contract (`src/cv/templateRegistry.js`).

## Original JobAssist CV Templates

The following templates are original JobAssist designs written for this
project (no third-party code was copied), so no upstream license obligations
apply. They are recorded here because the registry contract requires every
template to carry provenance:

- `gray-header` (Klassisch), `slim-sidebar` (Modern), `tabellarisch`
  (Kompakt), `dark-bands` (Elegant) — original designs, added with the
  template registry.
- `kontrast` (Kontrast) — accent header with optional photo, two-column body.
  Added 2026-08-27. Layout id `header-photo`, supports photo, accent-capable.
- `serif` (Serif) — editorial single column, serif typography. Added
  2026-08-27. Layout id `single`, ATS-friendly, accent-capable.
- `zentriert` (Zentriert) — centered minimal with monogram. Added 2026-08-27.
  Layout id `centered`, ATS-friendly, accent-capable.

## Spartan CV Template

- **Upstream project:** "Spartan" theme for JSON Resume
- **Author:** Francesco Esposito
- **Source:** https://github.com/phoinixi/jsonresume-theme-spartan
- **License:** MIT (verified 2026-08-26 from the upstream `LICENSE` file)
- **Adaptation:** The layout design (single column, centered header, hairline
  rules, small letter-spaced section labels) follows the upstream theme. The
  implementation is an original re-implementation for JobAssist's react-pdf
  renderer (`src/cv/CVTemplate.jsx`, `SpartanTemplate`) and the DOM preview
  renderer (`src/cv/CVTemplatePicker.jsx`, `SpartanCV`). Template id:
  `spartan`.

### MIT License (upstream)

```
MIT License
Copyright (c) 2018 Francesco Esposito

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
