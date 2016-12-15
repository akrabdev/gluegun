const jetpack = require('fs-jetpack')
const Plugin = require('../domain/plugin')
const loadCommandFromFile = require('./command-loader')
const loadExtensionFromFile = require('./extension-loader')
const { isNotDirectory } = require('../utils/filesystem-utils')
const { isBlank } = require('../utils/string-utils')
const { map, contains, __ } = require('ramda')
const toml = require('toml')

/**
 * Is this name permitted?
 *
 * @param  {string} name The name to check
 * @return {bool}             `true` if this is restricted, otherwise `false`
 */
const isRestrictedName = contains(__, [''])

/**
 * Loads a plugin from a directory.
 *
 * @param {string} directory The full path to the directory to load.
 * @param {{}}     options   Additional options to customize the loading process.
 */
function loadFromDirectory (directory, options = {}) {
  const plugin = new Plugin()

  const {
    brand = 'gluegun',
    commandFilePattern = '*.js',
    extensionFilePattern = '*.js',
    commandNameToken,
    commandDescriptionToken,
    extensionNameToken,
    name
  } = options

  if (!isBlank(name)) {
    plugin.name = name
  }

  // sanity check the input
  if (isBlank(directory)) {
    plugin.loadState = 'error'
    plugin.errorState = 'input'
    return plugin
  }

  // directory check
  if (isNotDirectory(directory)) {
    plugin.loadState = 'error'
    plugin.errorState = 'missingdir'
    return plugin
  }

  plugin.directory = directory

  // the directory is the default name (unless we were told what it was)
  if (isBlank(name)) {
    plugin.name = jetpack.inspect(directory).name
  }

  const jetpackPlugin = jetpack.cwd(plugin.directory)

  // load the commands found in the commands sub-directory
  if (jetpackPlugin.exists('commands') === 'dir') {
    plugin.commands = map(
      file => loadCommandFromFile(
        `${directory}/commands/${file}`,
        { commandNameToken, commandDescriptionToken }
      ),
      jetpackPlugin.cwd('commands').find({ matching: commandFilePattern, recursive: false })
      )
  } else {
    plugin.commands = []
  }

  // load the commands found in the commands sub-directory
  if (jetpackPlugin.exists('extensions') === 'dir') {
    plugin.extensions = map(
      file => loadExtensionFromFile(`${directory}/extensions/${file}`, { extensionNameToken }),
      jetpackPlugin.cwd('extensions').find({ matching: extensionFilePattern, recursive: false })
      )
  } else {
    plugin.extensions = []
  }
  // if we have a config toml
  try {
    // attempt to load the toml file
    const tomlFile = `${directory}/${brand}.toml`

    // read it
    const config = toml.parse(jetpack.read(tomlFile) || '') || {}

    // set the name if we have one (unless we were told what it was)
    if (isBlank(name)) {
      plugin.name = config.name || plugin.name
    }
    plugin[brand] = config[brand]
    plugin.defaults = config.defaults || {}
    plugin.description = config.description

    // restrict name
  } catch (e) {
    // no worries, configs are optional
  }

    // check for restricted names
  if (isRestrictedName(plugin.name)) {
    plugin.loadState = 'error'
    plugin.errorState = 'badname'
    return plugin
  }

  // we are good!
  plugin.loadState = 'ok'
  plugin.errorState = 'none'

  return plugin
}

module.exports = loadFromDirectory
