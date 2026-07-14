/**
 * Compresses an image file (JPEG/PNG) to a maximum size of 500KB.
 * Automatically scales down dimensions and adjusts quality.
 * Returns a Promise that resolves to the compressed Base64 data URL.
 * 
 * @param {File} file - The file to compress
 * @returns {Promise<string>} - Compressed Base64 data URL
 */
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    // Validate format
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      return reject(new Error('Format file harus JPG atau PNG'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max dimension rule (1200px)
        const MAX_DIM = 1200;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try compressing with decreasing quality
        let quality = 0.8;
        let base64 = canvas.toDataURL('image/jpeg', quality);
        
        // Base64 size estimation: length * 0.75
        while (base64.length * 0.75 > 500 * 1024 && quality > 0.1) {
          quality -= 0.1;
          base64 = canvas.toDataURL('image/jpeg', quality);
        }

        if (base64.length * 0.75 > 500 * 1024) {
          return reject(new Error('Gambar terlalu besar, gagal dikompres di bawah 500KB'));
        }

        resolve(base64);
      };
      img.onerror = () => reject(new Error('Gagal memuat gambar'));
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
  });
}
