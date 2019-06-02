const BaseController = require('../../src/js/common/BaseController.js');

const config = require('./config.json');

class LoginController extends BaseController {
  constructor() {
    super({ path: config.path });
  }

  getRoot(req, res) {
    if (req.isAuthenticated()) {
      req.saveSessionAndRedirect('/');
    } else {
      if (req.session.kioskMode > 0) {
        res.render('kiosk');
      } else {
        res.render('login');
      }
    }
  }

  postRoot(req, res) {
    req.saveSessionAndRedirect('/checkout');
  }
}

module.exports = LoginController;
