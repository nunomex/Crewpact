// Config plugin (CNG) — desliga o "User Script Sandboxing" do Xcode em todas as
// configurações de build (ENABLE_USER_SCRIPT_SANDBOXING = NO).
//
// PORQUÊ: no Xcode 15/16 o sandboxing de scripts está ON por omissão e bloqueia os
// build phases do React Native / expo-dev-client que escrevem ficheiros (ex.: o
// `ip.txt` com o IP do servidor de dev) → erro:
//   "Sandbox: deny(1) file-write-create … /CrewPact.app/ip.txt (in target 'CrewPact')"
// Como o /ios é efémero (CNG), este plugin garante o setting a cada prebuild.
const { withXcodeProject } = require('@expo/config-plugins');

module.exports = function withDisableScriptSandboxing(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const section = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(section)) {
      const bs = section[key] && section[key].buildSettings;
      if (bs) bs.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
    }
    return cfg;
  });
};
