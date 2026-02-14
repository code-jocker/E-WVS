const QRCode = require('qrcode');

const generateQRCode = async (text) => {
  try {
    return await QRCode.toDataURL(text);
  } catch (err) {
    console.error(err);
    return null;
  }
};

module.exports = generateQRCode;
