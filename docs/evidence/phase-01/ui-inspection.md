# Visual inspection

Inspected 2026-09-11 around 10:55 IST. Browser: local Google Chrome 153.0.8010.36, Windows x64. Production build served by Vite preview on 127.0.0.1:4175 using Playwright 1.63.0. Evidence directory: browser-2026-09-11T05-24-20-859Z. The neighboring empty directory is Playwright's test-discovery module initialization, not a separate missing test run.

| Viewport (CSS px) | Visual result | Layout measurement |
| --- | --- | --- |
| 1440 × 1000 | Three columns, readable labels and helper text; no overlaps; vertical document scrolling permitted | scrollWidth 1440; columns 260/792/280 px with 18px gaps |
| 1024 × 900 | Controls and viewport in two columns; inspector below; labels fit | scrollWidth 1024; no panel intersections |
| 768 × 1024 | Two columns and full-width lower inspector; readable wraps | scrollWidth 768; no panel intersections |
| 390 × 844 | One column in controls/viewport/inspector order; header wraps without clipping | scrollWidth 390; no panel intersections |
| 320 × 900 | Reflow at 320 CSS pixels; helper text and legend wrap; no horizontal scrolling | scrollWidth 320; no panel intersections |

Dark screenshots visually inspected for all five widths. Light desktop and narrow screenshots were also visually inspected; remaining light/focus captures accompany automated style checks. Normal text/labels remain readable, disabled state explanations stay visible, comparison metrics show unavailable text, no example data values appear. The native disabled sliders sit at their initial minimum but explicitly state that no data/depth is selected. No valid range/current forecast is claimed.

Keyboard procedure at each width: Tab to visible skip link, verify 3px solid outline, Enter focuses main, Tab skips all disabled controls to the disclosure, Enter toggles it open/closed; focus the theme button and Space toggles light/dark with aria-pressed agreement. Focus screenshots show the temporary skip link over the header, a deliberate keyboard navigation overlay. Light screenshots show the theme focus ring. Focus does not disappear against either theme.

Refresh restored the same main text in each viewport with default dark theme. Browser errors/warnings and failed requests were empty in all five JSON results. Only local static asset requests occurred; zero API calls and zero canvases. Tailwind utility verification: header computed display=flex and min-h-screen resolves to actual viewport height. All ten future controls were disabled; the Argo checkbox remained unchecked.

No globe, NetCDF, backend, live source, chart, collocation or anomaly computation was tested or represented as complete. 60 FPS, sub-second API and <50 KB scientific responses remain future targets. 320px reflow was tested; no blanket accessibility certification, OS-screen-reader test or every-browser claim is made.
