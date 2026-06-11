import { COLORS } from './colors.js';
 
const PATTERN_DIR = './BannerPatterns/';

// Function to generate and draw a banner image with specified pattern and color
async function generateBannerImage(patternFilename, colorName) {
    console.log(patternFilename)
    patternFilename += ".png";
    const offscreenCanvas = new OffscreenCanvas(20, 40);
    const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
    offscreenCtx.imageSmoothingEnabled = false;
    let colorHex = ""
    if(colorName.length==1){
        colorHex = COLORS.find(color => color.index === colorName).hex;
    }
    else{
        colorHex = COLORS.find(color => color.name === colorName).hex;
    }



    const fullPath = PATTERN_DIR + patternFilename;
    const cachedImg = preloadedImages.get(fullPath);

    return new Promise((resolve, reject) => {
        const draw = (img) => {
            offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
            offscreenCtx.drawImage(img, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

            const imageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
            const data = imageData.data;

            // Convert hex color to RGB
            const r = parseInt(colorHex.substring(0, 2), 16);
            const g = parseInt(colorHex.substring(2, 4), 16);
            const b = parseInt(colorHex.substring(4, 6), 16);

            for (let i = 0; i < data.length; i += 4) {
                // Only color non-transparent pixels (alpha > 0)
                if (data[i + 3] > 0) {
                    data[i] = (data[i] * r) / 255;     // Red
                    data[i + 1] = (data[i + 1] * g) / 255; // Green
                    data[i + 2] = (data[i + 2] * b) / 255; // Blue
                }
            }

            offscreenCtx.putImageData(imageData, 0, 0);
            resolve(offscreenCanvas);
        };

        if (cachedImg) {
            // 复用预加载的 Image 对象，无需重新请求网络
            draw(cachedImg);
        } else {
            const img = new Image();
            img.src = fullPath;
            img.onload = () => draw(img);
            img.onerror = (e) => {
                console.error('Error loading image:', img.src, e);
                reject(e);
            };
        }
    });
}

// New function to overlay two images
async function overlayImages(image1, image2) {
    const offscreenCanvas = new OffscreenCanvas(20, 40);
    const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
    offscreenCtx.imageSmoothingEnabled = false;
    return new Promise((resolve, reject) => {
        offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        offscreenCtx.drawImage(image1, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        offscreenCtx.drawImage(image2, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        createImageBitmap(offscreenCanvas).then(resolve).catch(reject);
    });
}
// bannerStr: [color][pattern],[color][pattern]...
async function MultipleLayers(bannerStr) {
    let args = bannerStr.split(',');
    let img = null;
    for (const element of args) {
        let color = element.substring(0, 1);
        let pattern = element.substring(1);
        const newImage = await generateBannerImage(pattern, color);
        if (img === null) {
            img = newImage;
        } else {
            img = await overlayImages(img, newImage);
        }
    }
    return img;
}

const preloadedImages = new Map();

async function preloadImages(imagePaths) {
    const promises = [];
    for (const path of imagePaths) {
        const fullPath = PATTERN_DIR + path;
        if (!preloadedImages.has(fullPath)) {
            const img = new Image();
            img.src = fullPath;
            promises.push(new Promise((resolve, reject) => {
                img.onload = () => {
                    preloadedImages.set(fullPath, img);
                    resolve();
                };
                img.onerror = (e) => {
                    console.error(`Error preloading image: ${fullPath}`, e);
                    reject(e);
                };
            }));
        }
    }
    return Promise.all(promises);
}

// Function to convert banner string to Minecraft Java Edition command
function convertToMinecraftCommand(bannerString) {
    // Pattern mapping from aliases to Minecraft pattern names
    const patternMap = {
        'ts': 'stripe_top',
        'ls': 'stripe_left', 
        'rs': 'stripe_right',
        'cs': 'stripe_center',
        'ms': 'stripe_middle',
        'drs': 'stripe_downright',
        'dls': 'stripe_downleft',
        'ss': 'small_stripes',
        'cr': 'cross',
        'sc': 'straight_cross',
        'ld': 'diagonal_left',
        'rud': 'diagonal_right',
        'lud': 'diagonal_up_left',
        'rd': 'diagonal_up_right',
        'vh': 'half_vertical',
        'vhr': 'half_vertical_right',
        'hh': 'half_horizontal',
        'hhb': 'half_horizontal_bottom',
        'bl': 'square_bottom_left',
        'br': 'square_bottom_right',
        'tl': 'square_top_left',
        'tr': 'square_top_right',
        'bt': 'triangle_bottom',
        'tt': 'triangle_top',
        'bts': 'triangles_bottom',
        'tts': 'triangles_top',
        'mc': 'circle',
        'mr': 'rhombus',
        'bo': 'border',
        'cbo': 'curly_border',
        'bri': 'bricks',
        'gra': 'gradient',
        'gru': 'gradient_up',
        'cre': 'creeper',
        'sku': 'skull',
        'flo': 'flower',
        'moj': 'mojang',
        'glb': 'globe',
        'pig': 'piglin',
        'flw': 'flow',
        'gus': 'guster'
    };

    try {
        // Parse banner string to extract background color and patterns
        const parts = bannerString.split(',');
        if (parts.length === 0) {
            throw new Error('Invalid banner string format');
        }

        // Extract background color from the first part
        const backgroundColorMatch = bannerString.match(/^([a-zA-Z_]+)/);
        let baseColor = 'white'; // default
        let patternString = bannerString;
        
        if (backgroundColorMatch) {
            const bgColorName = backgroundColorMatch[1];
            // Check if it's a valid color name
            const colorExists = COLORS.find(c => c.name === bgColorName);
            if (colorExists) {
                baseColor = bgColorName;
                patternString = bannerString.substring(bgColorName.length + 1); // +1 for comma
            }
        }

        // Parse patterns
        const patterns = [];
        if (patternString) {
            const patternParts = patternString.split(',');
            
            for (let i = 0; i < patternParts.length; i++) {
                const part = patternParts[i];
                if (part.length >= 2) {
                    const colorIndex = part.substring(0, 1);
                    const patternCode = part.substring(1);
                    
                    // Special handling for 'base' pattern - it determines the banner base color
                    if (patternCode === 'base') {
                        // Find color name by index
                        const colorInfo = COLORS.find(c => c.index === colorIndex);
                        if (colorInfo) {
                            baseColor = colorInfo.name;
                        }
                        // Skip adding 'base' to patterns array as it's not a Minecraft pattern
                        continue;
                    }
                    
                    // Find color name by index
                    const colorInfo = COLORS.find(c => c.index === colorIndex);
                    if (!colorInfo) {
                        console.warn(`Unknown color index: ${colorIndex}`);
                        continue;
                    }
                    
                    // Find pattern name by code
                    const patternName = patternMap[patternCode];
                    if (!patternName) {
                        console.warn(`Unknown pattern code: ${patternCode}`);
                        continue;
                    }
                    
                    patterns.push({
                        color: colorInfo.name,
                        pattern: patternName
                    });
                }
            }
        }

        // Build Minecraft command
        let command = `/give @p minecraft:${baseColor}_banner`;
        
        if (patterns.length > 0) {
            const patternArray = patterns.map(p => `{color: "${p.color}", pattern: "${p.pattern}"}`).join(',');
            command += `[minecraft:banner_patterns=[${patternArray}]]`;
        }
        
        return command;
        
    } catch (error) {
        console.error('Error converting banner string to Minecraft command:', error);
        return null;
    }
}

export { generateBannerImage, overlayImages, PATTERN_DIR, COLORS, MultipleLayers, preloadImages, convertToMinecraftCommand };