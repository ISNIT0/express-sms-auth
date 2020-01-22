import { Router, Request, Response } from 'express'
import asyncHandler from 'express-async-handler'
import * as bodyParser from 'body-parser';
import Twilio from 'twilio';

export function expressSmsAuth(
    login: (verification: any, req: Request, res: Response) => void,
    config: { twilioSid: string, twilioToken: string, twilioServiceId: string },
    devPhoneNumbers: string[] = [],
) {

    const twilio = Twilio(config.twilioSid, config.twilioToken);
    const verificationService = twilio.verify.services(config.twilioServiceId);

    const router = Router();
    router.use(bodyParser.json());

    router.post(
        '/smsAuth/start',
        asyncHandler(async (req: Request, res: Response) => {
            const { phone } = req.body;
            if (process.env.NODE_ENV === 'development' && devPhoneNumbers.includes(phone)) {
                console.log(`Not sending SMS to dev phone number [${phone}]`);
                res.send({
                    verification: {
                        dev: true
                    }
                });
            } else {
                const verification = await verificationService.verifications.create({ to: phone as string, channel: 'sms' });
                res.send({ verification });
            }
        })
    );

    router.post(
        '/smsAuth/check',
        asyncHandler(async (req: Request, res: Response) => {
            const { phone, code } = req.body;
            if (process.env.NODE_ENV === 'development' && devPhoneNumbers.includes(phone)) {
                console.log(`Not checking code for dev phone number [${phone}]`);
                login({ status: 'approved', dev: true }, req, res);
            } else {
                const verification = await verificationService.verificationChecks.create({ to: phone as string, code: code as string });
                if (verification.status === 'approved') {
                    login(verification, req, res);
                } else {
                    throw new Error(`Verification failed`);
                }
            }
        })
    );

    return router;
}
