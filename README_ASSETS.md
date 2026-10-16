# FRACTURE Asset Pack

This folder contains the procedural Blender generator and its asset manifest. The generator creates one self-contained GLB per manifest entry, a representative preview GLB, a contact render, and an import-based validation report.

## Run

Use Blender 3.6 or Blender 4.x with the glTF 2.0 exporter enabled:

```powershell
blender --background --python .\generate_fracture_assets.py
```

The script writes runtime assets to `public/assets/glb/` and preview outputs to `public/assets/previews/`. No external textures are used. All meshes use `FRACTURE_` names and all materials use `MAT_` names. The frontend should locate `FRACTURE_STATE_ACCENT` by node/object name, recolour it for disrupted or repaired presentation, and show/hide `FRACTURE_PROP_BLOCKER_BARRIER_*` as needed. The app remains authoritative for graph links, routes, labels, agents, and state.

## Asset list and dimensions

See `asset_manifest.json` for the full descriptions, pivots, and dimensions. It contains 21 modular assets: six buildings, two road modules, two junctions, three access assets, five props, and three environment assets. The preview-only ground plate is included as a separate asset. The preview assembly is additional and does not replace the modules.

## Palette

Ink `#111820`; asphalt `#29313A`; concrete `#A9AAA5`; limestone `#D8C9AD`; glass `#7895A6`; copper `#B77B4B`; vegetation `#526B54`; road marking `#E7E2D5`; state accent starts neutral `#E7E2D5`. Application overrides can use disrupted red `#E05252` and repaired teal `#55B9A5`.

## Geometry and validation

The geometry is built from low-sided primitives and repeated facade modules. Triangle counts and measured dimensions are written by the generator after GLB re-import. No measured counts are claimed until Blender runs the script. The report records per-asset import and dimension status.

## Limitations

The Blender generator has not been run in this environment because Blender is unavailable. Therefore this delivery contains no exported GLBs, contact render, or successful re-import results. Detailed validation status is in `validation_report.json`. The current generator creates visual prototypes; review the reported dimensions and iterate in Blender before shipping to a runtime app.
