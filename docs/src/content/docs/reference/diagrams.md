---
title: Diagrams
description: Mermaid diagrams rendered with the site palette.
---

Write a fenced `mermaid` block and it is drawn in the site's own colours. Node
fills, borders, edge lines and label text all come from the theme, so a diagram
follows dark and light without any per-diagram configuration.

## Flowchart

Subgraphs, node shapes and edge labels are all styled from the same palette.

```mermaid
flowchart LR
  Reader(["Reader"]) --> CDN["Edge cache"]
  CDN -->|miss| Origin["Origin"]

  subgraph Build["Build pipeline"]
    direction TB
    Content["Markdown"] --> Render["Static renderer"]
    Render --> Assets["CSS and JS"]
    Render --> Pages["HTML pages"]
  end

  Origin --> Pages
  Assets --> Browser["Browser runtime"]
  Pages --> Browser
  Browser -->|renders| Diagram["Diagram"]
  Browser --> Search[("Search index")]

  Diagram -.->|re-reads palette| Theme{{"Theme change"}}
  Theme -.-> Diagram
```

## Sequence

A different diagram type, drawn from the same colour variables.

```mermaid
sequenceDiagram
  participant Reader
  participant Page
  participant Renderer
  Reader->>Page: open a page with a diagram
  Page->>Renderer: mount
  Renderer->>Page: read colour variables
  Renderer-->>Reader: draw the diagram
  Note over Renderer,Page: the source is kept so it can be drawn again
  Reader->>Page: switch to dark
  Page->>Renderer: theme changed
  Renderer->>Page: read the new colours
  Renderer-->>Reader: redraw
```

## State

```mermaid
stateDiagram-v2
  [*] --> Collected
  Collected --> Rendered: mermaid runs
  Rendered --> Collected: theme changes
  Rendered --> [*]
```
