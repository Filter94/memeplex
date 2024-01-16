/* global Buffer */
import 'dotenv/config';
import { promises as fs } from 'fs';
import amqplib from 'amqplib';
import * as imghash from 'imghash';
import process from 'process';
import {
    AMQP_IMAGE_DATA_CHANNEL,
    AMQP_IMAGE_FILE_CHANNEL,
    EMPTY_QUEUE_RETRY_DELAY,
} from '../src/const.js';
import { checkFileExists, delay } from '../src/utils.js';
import {
    buildImageUrl,
    buildImagePath,
    downloadFile
} from '../src/download-images.js';

const doesFileExist = async (logger, destination, payload) => {
    const doesImageExist = await checkFileExists(destination);

    if (doesImageExist) {
        logger.info(`Image already exists: ${destination}`);
        return true;
    }

    const url = buildImageUrl(payload);
    logger.info(`downloading: ${url} -> ${destination}`);
    await downloadFile(url, destination, logger);

    // compute pHash
    const pHash = await imghash.hash(destination);

    // check if this pHash exists
    const pHashFilePath = './data/phashes/' + pHash;
    const doesExist = await checkFileExists(pHashFilePath);
    if (doesExist) {
        // if we have seen this phash, skip the image and remove
        // the downloaded file
        await fs.unlink(destination);
        return true;
    }
    await fs.writeFile(pHashFilePath, '');
    return false;
};

export const main = async (logger) => {
    const conn = await amqplib.connect(process.env.AMQP_ENDPOINT);
    const sendImageFileCh = await conn.createChannel();
    const receiveImageDataCh = await conn.createChannel();

    await receiveImageDataCh.assertQueue(AMQP_IMAGE_DATA_CHANNEL, { durable: true });

    for (;;) {
        const msg = await receiveImageDataCh.get(AMQP_IMAGE_DATA_CHANNEL);
        if (!msg) {
            logger.info('Queue is empty');
            await delay(EMPTY_QUEUE_RETRY_DELAY);
            continue;
        }
        const payload = JSON.parse(msg.content.toString());
        const destination = await buildImagePath(payload);

        const fileExist = await doesFileExist(logger, destination, payload);
        if (!fileExist) {
            const content = Buffer.from(JSON.stringify({
                ...payload,
                fileName: destination
            }));
            sendImageFileCh.sendToQueue(
                AMQP_IMAGE_FILE_CHANNEL,
                content,
                { persistent: true }
            );
        }
        receiveImageDataCh.ack(msg);
    }
};
