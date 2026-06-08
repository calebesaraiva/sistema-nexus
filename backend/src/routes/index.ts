import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { auth, permit } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { loginSchema, userSchema, userUpdateSchema, clientSchema, contractSchema, chargeSchema, messageGenerateSchema, messageSendSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema, changeRoleSchema, adminResetPasswordSchema, productSchema, packageSchema, projectSchema, taskStageSchema, projectTaskSchema, taskMoveSchema, taskRejectSchema } from '../validators/schemas';
import { forgotPassword, login, me, refresh, register, resetPassword, verifyEmail } from '../controllers/authController';
import { auditLogs, blockUser, changeUserRole, compensateBarter, createCharge, createClient, createPackage, createProduct, createProject, createUser, deleteClient, deletePackage, deleteProduct, deleteProject, deleteUser, financialDashboard, getClient, getPackage, getProduct, getUser, listCharges, listClients, listPackages, listPayments, listProducts, listProjects, listUsers, payCharge, resetUserPassword, unblockUser, updateClient, updatePackage, updateProduct, updateProject, updateUser } from '../controllers/crudController';
import { createContract, listContracts, updateContractStatus } from '../controllers/contractController';
import { generateMessage, listTemplates, sendMessage } from '../controllers/messageController';
import { upload, uploaded } from '../controllers/uploadController';
import { createClientDocument, deleteDocument, documentUpload, downloadDocument, listClientDocuments } from '../controllers/documentController';
import { approveTask, createStage, createTask, deleteStage, deleteTask, listStages, listTasks, moveTask, rejectTask, updateStage, updateTask } from '../controllers/taskController';

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

router.post('/auth/login', loginLimiter, validate(loginSchema), login);
router.post('/auth/refresh', refresh);
router.post('/auth/logout', (_req, res) => res.json({ success: true, data: null, message: 'Logout realizado' }));
router.post('/auth/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/auth/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/auth/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/auth/me', auth, me);
router.post('/auth/register', auth, permit('ADMIN_MASTER'), validate(userSchema), register);

router.get('/users', auth, permit('ADMIN_MASTER'), listUsers);
router.get('/team-users', auth, permit('ADMIN_MASTER', 'ADMIN', 'SUPORTE'), listUsers);
router.get('/users/:id', auth, permit('ADMIN_MASTER'), getUser);
router.post('/users', auth, permit('ADMIN_MASTER'), validate(userSchema), createUser);
router.put('/users/:id', auth, permit('ADMIN_MASTER'), validate(userUpdateSchema), updateUser);
router.patch('/users/:id/block', auth, permit('ADMIN_MASTER'), blockUser);
router.patch('/users/:id/unblock', auth, permit('ADMIN_MASTER'), unblockUser);
router.patch('/users/:id/change-role', auth, permit('ADMIN_MASTER'), validate(changeRoleSchema), changeUserRole);
router.patch('/users/:id/reset-password', auth, permit('ADMIN_MASTER'), validate(adminResetPasswordSchema), resetUserPassword);
router.delete('/users/:id', auth, permit('ADMIN_MASTER'), deleteUser);

router.get('/clients', auth, permit('ADMIN_MASTER', 'ADMIN', 'FINANCEIRO', 'VENDEDOR', 'SUPORTE'), listClients);
router.get('/clients/:id', auth, permit('ADMIN_MASTER', 'ADMIN', 'FINANCEIRO', 'VENDEDOR', 'SUPORTE'), getClient);
router.post('/clients', auth, permit('ADMIN_MASTER', 'ADMIN', 'VENDEDOR'), validate(clientSchema), createClient);
router.put('/clients/:id', auth, permit('ADMIN_MASTER', 'ADMIN', 'FINANCEIRO'), validate(clientSchema), updateClient);
router.delete('/clients/:id', auth, permit('ADMIN_MASTER'), deleteClient);
router.get('/clients/:clientId/documents', auth, permit('ADMIN_MASTER', 'ADMIN', 'FINANCEIRO', 'VENDEDOR', 'SUPORTE'), listClientDocuments);
router.post('/clients/:clientId/documents', auth, permit('ADMIN_MASTER', 'ADMIN', 'FINANCEIRO'), documentUpload.single('file'), createClientDocument);
router.get('/documents/:id/download', auth, permit('ADMIN_MASTER', 'ADMIN', 'FINANCEIRO', 'VENDEDOR', 'SUPORTE'), downloadDocument);
router.delete('/documents/:id', auth, permit('ADMIN_MASTER', 'ADMIN'), deleteDocument);

router.get('/products', auth, listProducts);
router.get('/products/:id', auth, getProduct);
router.post('/products', auth, permit('ADMIN_MASTER', 'ADMIN'), validate(productSchema), createProduct);
router.put('/products/:id', auth, permit('ADMIN_MASTER', 'ADMIN'), validate(productSchema), updateProduct);
router.delete('/products/:id', auth, permit('ADMIN_MASTER'), deleteProduct);

router.get('/packages', auth, listPackages);
router.get('/packages/:id', auth, getPackage);
router.post('/packages', auth, permit('ADMIN_MASTER', 'ADMIN'), validate(packageSchema), createPackage);
router.put('/packages/:id', auth, permit('ADMIN_MASTER', 'ADMIN'), validate(packageSchema), updatePackage);
router.delete('/packages/:id', auth, permit('ADMIN_MASTER'), deletePackage);
router.get('/contracts', auth, permit('ADMIN_MASTER', 'ADMIN', 'FINANCEIRO'), listContracts);
router.post('/contracts', auth, permit('ADMIN_MASTER', 'ADMIN'), validate(contractSchema), createContract);
router.patch('/contracts/:id/status', auth, permit('ADMIN_MASTER', 'ADMIN'), updateContractStatus);

router.get('/charges', auth, permit('ADMIN_MASTER', 'ADMIN', 'FINANCEIRO'), listCharges);
router.post('/charges', auth, permit('ADMIN_MASTER', 'ADMIN', 'FINANCEIRO'), validate(chargeSchema), createCharge);
router.patch('/charges/:id/pay', auth, permit('ADMIN_MASTER', 'FINANCEIRO'), payCharge);
router.patch('/charges/:id/compensate-barter', auth, permit('ADMIN_MASTER', 'ADMIN', 'FINANCEIRO'), compensateBarter);
router.get('/payments', auth, permit('ADMIN_MASTER', 'ADMIN', 'FINANCEIRO'), listPayments);
router.get('/dashboard/financial', auth, financialDashboard);
router.get('/projects', auth, permit('ADMIN_MASTER', 'ADMIN', 'SUPORTE'), listProjects);
router.post('/projects', auth, permit('ADMIN_MASTER', 'ADMIN', 'SUPORTE'), validate(projectSchema), createProject);
router.put('/projects/:id', auth, permit('ADMIN_MASTER', 'ADMIN', 'SUPORTE'), validate(projectSchema), updateProject);
router.delete('/projects/:id', auth, permit('ADMIN_MASTER', 'ADMIN'), deleteProject);

router.get('/task-stages', auth, permit('ADMIN_MASTER', 'ADMIN', 'SUPORTE'), listStages);
router.post('/task-stages', auth, permit('ADMIN_MASTER', 'ADMIN'), validate(taskStageSchema), createStage);
router.put('/task-stages/:id', auth, permit('ADMIN_MASTER', 'ADMIN'), validate(taskStageSchema), updateStage);
router.delete('/task-stages/:id', auth, permit('ADMIN_MASTER'), deleteStage);
router.get('/tasks', auth, permit('ADMIN_MASTER', 'ADMIN', 'SUPORTE'), listTasks);
router.post('/tasks', auth, permit('ADMIN_MASTER', 'ADMIN', 'SUPORTE'), validate(projectTaskSchema), createTask);
router.put('/tasks/:id', auth, permit('ADMIN_MASTER', 'ADMIN', 'SUPORTE'), validate(projectTaskSchema), updateTask);
router.patch('/tasks/:id/move', auth, permit('ADMIN_MASTER', 'ADMIN', 'SUPORTE'), validate(taskMoveSchema), moveTask);
router.patch('/tasks/:id/approve', auth, permit('ADMIN_MASTER', 'ADMIN', 'SUPORTE'), approveTask);
router.patch('/tasks/:id/reject', auth, permit('ADMIN_MASTER', 'ADMIN', 'SUPORTE'), validate(taskRejectSchema), rejectTask);
router.delete('/tasks/:id', auth, permit('ADMIN_MASTER', 'ADMIN'), deleteTask);

router.get('/message-templates', auth, listTemplates);
router.post('/messages/generate', auth, validate(messageGenerateSchema), generateMessage);
router.post('/messages/send', auth, validate(messageSendSchema), sendMessage);
router.get('/audit-logs', auth, permit('ADMIN_MASTER'), auditLogs);
router.post('/uploads', auth, upload.single('file'), uploaded);

export default router;
