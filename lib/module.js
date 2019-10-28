const { AbstractModule, Responder } = require('adapt-authoring-core');
const bytes = require('bytes');
const path = require('path');
const { spawn } = require('child_process');

/**
* An example authoring tool plugin to check disk usage
* @extends {AbstractModule}
*/
class StorageModule extends AbstractModule {
  /**
  * Creates the custom router
  * @param {App} app App instance
  * @param {Function} resolve Function to call on fulfilment
  * @param {Function} reject Function to call on rejection
  */
  preload(app, resolve, reject) {
    const apiRouter = app.getModule('server').api.createChildRouter('storage');

    app.auth.secureRoute(apiRouter.path, 'get', [ 'read:storage' ]);
    app.auth.secureRoute('/api/storage/:dir?', 'get', [ 'read:storage' ]);

    apiRouter.addRoute({
      route: '/:dir?',
      handlers: {
        get: async(req, res, next) => {
          const responder = new Responder(res);

          try {
            responder.success(await this.getDiskUsage(req.params.dir));
          } catch (error) {
            responder.error(error);
          }
        }
      }
    });

    app.getModule('server').root.createChildRouter('storage').expressRouter
      .get('/', this.handleIndex.bind(this));

    resolve();
  }
  getDiskUsage(directory = 'bin') {
    return new Promise((resolve, reject) => {
      const childProcess = spawn('du', [ '-scB1', directory ]);
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
  /**
  * Renders the index page
  * @param {ClientRequest} req The client request object
  * @param {ServerResponse} res The server response object
  * @param {function} next The next middleware function in the stack
  */
  async handleIndex(req, res, next) {
    const responder = new Responder(res);

    try {
      const size = await this.getDiskUsage();
      const getSizeString = size => bytes.format(size, { unitSeparator: ' ' });
      const limit = bytes.parse(this.getConfig('storageLimit')) || null;

      responder.html().success({
        raw: size,
        string: getSizeString(size),
        percent: Math.round(size / limit * 100),
        limit: getSizeString(limit)
      }, { filepath: path.join(__dirname, '../views/index') });
    } catch (error) {
      responder.error(error);
    }
  }
}

module.exports = StorageModule;
