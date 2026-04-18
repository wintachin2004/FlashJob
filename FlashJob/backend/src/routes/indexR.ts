import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as gigController from '../controllers/gigController';
import * as orderController from '../controllers/orderController';
import * as reviewController from '../controllers/reviewController';
import * as categoryController from '../controllers/categoryController';
import * as userController from '../controllers/userController';
import { authenticate, requireSeller, requireAdmin } from '../middleware/auth';

const router = Router();

// ── Auth ───────────────────────────────────────────────────
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.getMe);
router.patch('/auth/me', authenticate, authController.updateProfile);

// ── Categories ─────────────────────────────────────────────
router.get('/categories', categoryController.getCategories);
router.get('/categories/:slug', categoryController.getCategoryBySlug);
router.post('/categories', authenticate, requireAdmin, categoryController.createCategory);

// ── Gigs ───────────────────────────────────────────────────
router.get('/gigs', gigController.listGigs);
router.get('/gigs/seller/:sellerId', gigController.getSellerGigs);
router.get('/gigs/:id', gigController.getGig);
router.post('/gigs', authenticate, requireSeller, gigController.createGig);
router.patch('/gigs/:id', authenticate, gigController.updateGig);
router.delete('/gigs/:id', authenticate, gigController.deleteGig);

// ── Orders ─────────────────────────────────────────────────
router.get('/orders', authenticate, orderController.getMyOrders);
router.post('/orders', authenticate, orderController.createOrder);
router.get('/orders/:id', authenticate, orderController.getOrder);
router.patch('/orders/:id/status', authenticate, orderController.updateOrderStatus);
router.post('/orders/:id/messages', authenticate, orderController.sendMessage);

// ── Reviews ────────────────────────────────────────────────
router.post('/reviews', authenticate, reviewController.createReview);
router.get('/reviews/gig/:gigId', reviewController.getGigReviews);

// ── Users ──────────────────────────────────────────────────
router.get('/users/:username', userController.getPublicProfile);
router.get('/users/me/saved-gigs', authenticate, userController.getSavedGigs);
router.post('/users/saved-gigs/:gigId', authenticate, userController.saveGig);
router.delete('/users/saved-gigs/:gigId', authenticate, userController.unsaveGig);

export default router;
