import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Salud (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /salud responde 200 con estado ok', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/salud')
      .expect(200);
    expect(respuesta.body.estado).toBe('ok');
  });
});
