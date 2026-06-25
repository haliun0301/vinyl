This is a Vite + React + TypeScript project managed with `pnpm`.

Use Tailwind CSS as the default and primary styling system for new UI work.

The repository's purpose is interactive frontend prototyping for visualization and experience design. Keep data preparation, placement rules, and visualization-facing mock data in this project when they support frontend development.

Use `src/assets/data/` for static, rarely changing, small data files under a few hundred KB. Vite can process these files, optimize them, and hot reload changes. This is appropriate for example data and development mock data.

Use `public/data/` for static data that is several MB or larger, or data that should be loaded directly with `fetch`. Vite copies these files unchanged into the dist root, and they are available at URLs such as `/data/file.csv`.

Prefer Recharts for standard charts. Add D3 only when custom layouts, scales, shapes, interactions, or data transforms justify it.

Do not commit generated build output unless explicitly asked.
