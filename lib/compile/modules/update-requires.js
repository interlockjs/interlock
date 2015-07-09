export default function updateRequires (module, modulesByAbsPath) {
  module.requireNodes.forEach(requireNode => {
    const requireHash = modulesByAbsPath[requireNode.resolved].hash;
    requireNode.arguments[0].oldValue = requireNode.arguments[0].value;
    requireNode.arguments[0].value = requireHash;
    requireNode.arguments[0].raw = "\"" + requireHash + "\"";
  });
  return module;
}
