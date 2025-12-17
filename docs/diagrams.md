# Diagrams

This repo includes diagram sources under `diagrams/`:

- `diagrams/system.puml` — PlantUML source
- `diagrams/system.md` — Mermaid source

If you want the generated PNG/SVG files committed, render them locally using PlantUML or Mermaid CLI (or use Docker images).

Example PlantUML render (requires Docker):
```bash
docker run --rm -v "$PWD":/workspace -w /workspace plantuml/plantuml -tpng diagrams/system.puml
```

Example Mermaid render (requires Docker):
```bash
docker run --rm -v "$PWD":/workspace -w /workspace minlag/mermaid-cli -i diagrams/system.md -o docs/system.png
```
