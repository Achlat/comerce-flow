const express = require('express');
const router = express.Router();

router.use('/auth',        require('./auth'));
router.use('/dashboard',   require('./dashboard'));
router.use('/produits',    require('./produits'));
router.use('/inventaire',  require('./inventaire'));
router.use('/fournisseurs',require('./fournisseurs'));
router.use('/clients',     require('./clients'));
router.use('/historique',  require('./historique'));
router.use('/export',      require('./export'));

module.exports = router;
