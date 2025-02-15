const { AbstractModule } = require('adapt-authoring-core');
const bytes = require('bytes');
const path = require('path');
const { spawn } = require('child_process');

/**
* An authoring tool API to check disk usage
* @extends {AbstractModule}
*/
class StorageModule extends AbstractModule {
  /** @override */
  async init() {
    const getConf = (m,a) => this.app.config.get(`adapt-authoring-${m}.${a}`);
    const fwSrcDir = path.resolve(getConf('adaptFramework', 'frameworkDir'), 'src');

    this.sizeLimit = bytes.parse(this.getConfig('storageLimit')) || null;
    this.types = {
      assets: [
        getConf('assets', 'uploadDir')
      ],
      cache: [
        getConf('core', 'uploadTempDir'),
        getConf('adaptFramework', 'buildDir')
      ],
      plugins: [
        path.resolve(fwSrcDir, 'components'),
        path.resolve(fwSrcDir, 'extensions'),
        path.resolve(fwSrcDir, 'menu'),
        path.resolve(fwSrcDir, 'theme'),
        getConf('contentplugin', 'pluginInstallDir')
      ],
      total: [
        this.app.rootDir
      ]
    };
    await this.initRouter()

    const ui = await this.app.waitForModule('ui');
    ui.addUiPlugin(`${this.rootDir}/plugins`);
  }
  /**
   * Creates the API router
   */
  async initRouter() {
    const [auth, server] = await this.app.waitForModule('auth', 'server');
    const router = server.api.createChildRouter('storage');
    router.addRoute({ 
      route: '/', 
      handlers: {  get: this.handleRequest.bind(this) }
    });
    auth.secureRoute(router.path, 'get', ['read:storage']);
  }
  /**
   * Calculates the disk space usage of a specific directory
   * @param {String} directory Directory to calculate space
   * @returns {Promise} Resolves with the figure
   */
  async getDiskUsage(directory) {
    if(Array.isArray(directory)) {
      const results = await Promise.all(directory.map(p => this.getDiskUsage(p)));
      return results.reduce((t,r) => t + r);
    }
    return new Promise((resolve, reject) => {
      const dir = path.resolve(this.app.rootDir, directory);
      const childProcess = spawn('du', [ '-scB1', dir ]);
      const collateOutput = data => output += data.toString();
      let output = '';
  
      childProcess.stdout.on('data', collateOutput);
      childProcess.stderr.on('data', collateOutput);
      
      childProcess.on('close', code => {
        if (code) resolve(0);
        resolve(parseInt(output.match(/^(\d+)/gm).pop(), 10));
      });
    });
  }
  /**
   * Generates a summary of all storage space use
   * @returns {Promise} Resolves with the amalgamated stats object
   */
  async getStats() {
    const stats = {};
    let systemSize = 0;

    await Promise.all(Object.entries(this.types).map(async ([name, paths]) => {
      const size = await this.getDiskUsage(paths);
      systemSize += name === 'total' ? size : size*-1;
      stats[name] = this.sizeToStats(size);
    }));
    const { storageSize: dbSize } = await (await this.app.waitForModule('mongodb')).getStats();
    stats.db = this.sizeToStats(dbSize);
    stats.limit = this.sizeToStats(this.sizeLimit);
    stats.system = this.sizeToStats(systemSize);
    
    const freeSpace = stats.limit.raw - stats.total.raw;
    stats.free = this.sizeToStats(freeSpace > 0 ? freeSpace : null);

    return stats;
  }
  /**
   * Generates a summary of stats use for a specific size
   * @param {Number} size
   * @returns {Promise} Resolves with the stats object
   */
  sizeToStats(size) {
    return {
      raw: size,
      string: bytes.format(size, { unitSeparator: ' ' }),
      percent: Math.round(size / this.sizeLimit * 100)
    };
  }
  /**
   * API handler
   * @param {ClientRequest} req 
   * @param {ServerResponse} res 
   * @param {Function} next 
   */
  async handleRequest(req, res, next) {
    try {
      res.json(await this.getStats());
    } catch (error) {
      next(error);
    }
  }
}

module.exports = StorageModule;