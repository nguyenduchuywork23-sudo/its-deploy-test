import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return running status info', () => {
      const res = appController.getHello();
      expect(res.status).toBe('ok');
      expect(res.message).toBe('Internship Tracking System API is running');
      expect(res.timestamp).toBeDefined();
    });

    it('should return health status', () => {
      const res = appController.getHealth();
      expect(res.status).toBe('ok');
      expect(res.uptime).toBeDefined();
      expect(res.timestamp).toBeDefined();
    });
  });
});
