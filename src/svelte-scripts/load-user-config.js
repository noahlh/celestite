import { loadConfigFromFile } from "vite";
import { resolve } from "path";

/**
 * Checks if a plugin is the Svelte plugin from @sveltejs/vite-plugin-svelte.
 * Handles both named exports (svelte()) and direct imports.
 */
function isSveltePlugin(plugin) {
  if (!plugin) return false;
  // Check by name property that Svelte plugin sets
  return plugin.name === "vite-plugin-svelte" || plugin.name === "svelte";
}

/**
 * Removes Svelte plugins from user config to prevent duplication.
 * Celestite always adds its own Svelte plugin with specific settings.
 */
export function filterSveltePlugin(userConfig) {
  if (!userConfig || !userConfig.plugins) return userConfig;
  return {
    ...userConfig,
    plugins: userConfig.plugins.filter(p => !isSveltePlugin(p))
  };
}

/**
 * Loads the user's Vite config from VITE_CONFIG_PATH.
 *
 * Resolves the path against ROOT_DIR (set by Celestite's Crystal renderer)
 * so relative paths work regardless of the process's cwd.
 *
 * @param {object} configEnv - Vite ConfigEnv: { mode, command, isSsrBuild }
 * @returns {Promise<import('vite').UserConfig | null>}
 */
export async function loadUserViteConfig(configEnv) {
  const viteConfigPath = process.env.VITE_CONFIG_PATH;
  if (!viteConfigPath) return null;

  const rootDir = process.env.ROOT_DIR;
  if (!rootDir) {
    console.error("[celestite] ROOT_DIR not set — cannot resolve VITE_CONFIG_PATH");
    return null;
  }

  const resolvedPath = resolve(rootDir, viteConfigPath);

  try {
    const loaded = await loadConfigFromFile(configEnv, resolvedPath);

    if (!loaded) {
      console.warn(`[celestite] No config exported from: ${resolvedPath}`);
      return null;
    }

    console.log(`[celestite] Loaded user vite config from: ${resolvedPath}`);
    return filterSveltePlugin(loaded.config);
  } catch (e) {
    console.error(`[celestite] Failed to load user vite config from ${resolvedPath}:`, e.message);
    return null;
  }
}
