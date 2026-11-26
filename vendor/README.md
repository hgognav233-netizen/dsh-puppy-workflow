# Vendored files

## three/ — three.js 0.184.0 (MIT, see three/LICENSE)

Downloaded unchanged from the npm package `three@0.184.0` via jsDelivr
(`https://cdn.jsdelivr.net/npm/three@0.184.0/<path>`). SHA-256 checked against
jsDelivr's published package listing:

| File | Bytes |
|---|---|
| build/three.core.min.js | 384222 |
| build/three.module.min.js | 364998 |
| examples/jsm/loaders/GLTFLoader.js | 114959 |
| examples/jsm/utils/BufferGeometryUtils.js | 35539 |
| LICENSE | 1081 |

The files are not edited. While serving them, `index.js` rewrites two kinds of
import so they work without an import map:

- `from 'three'` → `from '../../../build/three.module.min.js'`
- `from '../utils/SkeletonUtils.js'` (GLTFLoader) → `skeleton-utils-stub.js`

## skeleton-utils-stub.js

Written for this plugin, not part of three.js. GLTFLoader only needs
`SkeletonUtils.clone` for skinned meshes, which the island model does not use.
