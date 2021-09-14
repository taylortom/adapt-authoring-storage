const AbstractApiModule = require('adapt-authoring-api');
const bytes = require('bytes');
const { spawn } = require('child_process');

/**
* An example authoring tool plugin to check disk usage
* @extends {AbstractApiModule}
*/
class StorageModule extends AbstractApiModule {
  /** @override  */
  async setValues() {
    /** @ignore */ this.root = 'storage';
    /** @ignore */ this.routes = [{ 
      route: '/', 
      handlers: {  get: this.handleRequest.bind(this) },
      permissions: { get: ['read:storage'] }
    }];
    this.sizeLimit = bytes.parse(this.getConfig('storageLimit')) || null;

    const fwSrcDir = path.resolve(getConf('adaptFramework', 'frameworkDir'), 'src');

    const getConf = (m,a) => this.app.config.get(`adapt-authoring-${m}.${a}`);
    this.types = [
      {
        name: 'assets',
        paths: [getConf('assets', 'uploadDir')]
      },
      {
        name: 'cache',
        paths: [
          getConf('core', 'uploadTempDir'),
          getConf('adaptFramework', 'buildDir')
        ]
      },
      {
        name: 'plugins',
        paths: [
          path.resolve(fwSrcDir, 'components'),
          path.resolve(fwSrcDir, 'extensions'),
          path.resolve(fwSrcDir, 'menu'),
          path.resolve(fwSrcDir, 'theme'),
          getConf('core', 'pluginInstallDir')
        ]
      },
      {
        name: 'total',
        paths: [this.app.rootDir]
      }
    ]
  }
  /** @override */
  async init() {
    const ui = this.app.waitForModule('ui');
    ui.addUiPlugin(`${this.rootDir}/plugins`);
  }
  /**
   * Calculates the disk space usage of a specific directory
   * @param {String} directory Directory to calculate space
   * @returns {Promise} Resolves with the figure
   */
  getDiskUsage(...directory) {
    if(Array.isArray(directory)) {
      return (await Promise.all(directory.map(this.getDiskUsage))).reduce((m,d) => m += d);
    }
    return new Promise((resolve, reject) => {
      const dir = directory || this.app.getConfig('tempDir');
      const childProcess = spawn('du', [ '-scB1', dir ]);
      const collateOutput = data => output += data.toString();
      let output = '';

      childProcess.stdout.on('data', collateOutput);
      childProcess.stderr.on('data', collateOutput);
      
      childProcess.on('close', code => {
        if (code) reject(output);
        resolve(parseInt(output.match(/^(\d+)/gm).pop(), 10));
      });
    });
  }
  getStats(size) {
    return {
      raw: size,
      string: this.getSizeString(size),
      percent: Math.round(size / this.sizeLimit * 100)
    };
  }
  async handleRequest(req, res, next) {
    try {
      res.json({
        ...this.types.map(t => {
          console.log(t.name, this.getDiskUsage(t.paths));
          return {};
          // return { [t.name]: this.getStats() }  
        }),
        limit: this.getStats(this.sizeLimit)
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Formats a size number into a human-readable string
   * @param {Number} size
   * @return {String} The formatted size
   */
  getSizeString(size) {
    return bytes.format(size, { unitSeparator: ' ' });
  }
}

module.exports = StorageModule;