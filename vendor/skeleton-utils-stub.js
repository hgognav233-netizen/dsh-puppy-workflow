// Stand-in for three/examples/jsm/utils/SkeletonUtils.js, which GLTFLoader
// imports only to clone skinned (bone-animated) meshes. The island model has
// no skinned meshes, so a plain clone is enough and the file is not vendored.
export function clone(source) {
  return source.clone(true)
}
