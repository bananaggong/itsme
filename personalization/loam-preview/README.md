# LOAM portfolio preview

Database-free fictional example: **마감한입**, a neighborhood café surplus-food reservation service.
All interviews, numbers, dates, decisions and AI results are fixtures, not operational claims.

The `vendor/` components were copied from `bananaggong/loam`,
commit `8c682fe0a1d83d5102d5547d61130ce4a941b51a`.
Card, Badge, Button, OverallConfidence, HypothesisCard, SignalResultCard,
DecisionMemoryTimeline, stateLabels and domain types retain the source implementation.
`StateSuggestionBanner` is a local adapter with the same layout and in-memory handlers.
The preview shell, navigation, evidence examples, thumbnail composition and native dialog
are portfolio-only additions. No database, auth or AI SDK is bundled.

```sh
npm ci
npm run build
```

This builds to `public/personal/projects/loam-demo/`, served by the portfolio on port 3000.
The three views are `?view=board`, `?view=evidence`, and `?view=memory`.
`?view=thumbnail` is a 900 × 640 composition of the real card components for capture.

Screen captures used by the portfolio:
- `loam-card.jpg`: thumbnail at 900 × 640
- `loam-board.jpg`: board at 1440 × 1060
- `loam-evidence.jpg`: evidence at 1100 × 900
- `loam-memory.jpg`: confirmed decision at 1100 × 900

The preview makes no API requests. Decisions live only in React state; reset or reload
restores the fixed example. Nothing is written to the actual LOAM service.
