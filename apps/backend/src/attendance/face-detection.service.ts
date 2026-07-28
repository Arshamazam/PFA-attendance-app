import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { join } from 'path';
import { readFile } from 'fs/promises';

@Injectable()
export class FaceDetectionService implements OnModuleInit {
  private readonly logger = new Logger(FaceDetectionService.name);
  private ready = false;
  private tf: any;
  private faceapi: any;

  async onModuleInit(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.tf = require('@tensorflow/tfjs-node');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.faceapi = require('@vladmandic/face-api');
      const modelPath = join(
        process.cwd(),
        'node_modules',
        '@vladmandic',
        'face-api',
        'model',
      );
      await this.faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
      this.ready = true;
      this.logger.log('Face detection ready (tinyFaceDetector loaded)');
    } catch (err) {
      this.logger.warn(
        `Face detection unavailable — photos will pass through: ${err}`,
      );
    }
  }

  async hasFace(imagePath: string): Promise<boolean> {
    if (!this.ready) return true; // fail-open when model not loaded
    try {
      const buffer = await readFile(imagePath);
      const tensor = this.tf.node.decodeImage(buffer, 3) as any;
      const detections = await this.faceapi.detectAllFaces(
        tensor,
        new this.faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }),
      );
      tensor.dispose();
      return (detections as any[]).length > 0;
    } catch {
      return true; // fail-open on processing errors
    }
  }
}
