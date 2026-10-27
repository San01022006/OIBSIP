import { Router } from 'express';
import * as rawCtrl from '../controllers/menuController.js';
import { wrapControllers } from '../utils/controller.js';

const router = Router();
const ctrl = wrapControllers(rawCtrl);

router.get('/pizzas', ctrl.listPizzas);
router.get('/pizzas/:id', ctrl.getPizza);
router.get('/ingredients', ctrl.listIngredients);

export default router;
