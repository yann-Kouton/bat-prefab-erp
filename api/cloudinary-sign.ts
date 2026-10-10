import { v2 as cloudinary } from 'cloudinary';
import { HttpError, requireUser, route } from './_lib/admin';

/**
 * Signe un upload Cloudinary. Le secret ne quitte jamais le serveur ;
 * le dossier est forcé sous "bat-prefab/" pour qu'un client ne puisse pas écrire ailleurs.
 */
export default route(async (req) => {
  await requireUser(req, ['admin', 'direction', 'chef_chantier']);

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new HttpError(500, 'Configuration Cloudinary incomplète sur le serveur.');

  const folder = String(req.body?.folder ?? '');
  if (!/^bat-prefab\/[\w\-/]+$/.test(folder)) throw new HttpError(400, 'Dossier invalide.');

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, apiSecret);
  return { cloudName, apiKey, timestamp, signature, folder };
});
