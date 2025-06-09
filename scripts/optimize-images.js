const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '../public/images');
const OPTIMIZED_DIR = path.join(__dirname, '../public/images-optimized');
const PUBLIC_DIR = path.join(__dirname, '../public');
const OPTIMIZED_PUBLIC_DIR = path.join(__dirname, '../public-optimized');

// 이미지 최적화 설정
const OPTIMIZATION_CONFIG = {
    webp: {
        quality: 80,
        effort: 6
    },
    jpeg: {
        quality: 80,
        progressive: true
    },
    png: {
        quality: 80,
        compressionLevel: 9
    },
    resize: {
        width: 400,  // 최대 가로 크기
        height: 400, // 최대 세로 크기
        fit: 'inside',
        withoutEnlargement: true
    }
};

async function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function optimizeImage(inputPath, outputDir, filename) {
    try {
        const outputPath = path.join(outputDir, filename);
        const webpPath = path.join(outputDir, filename.replace(/\.(jpg|jpeg|png)$/i, '.webp'));
        
        // 원본 파일 크기 확인
        const originalSize = fs.statSync(inputPath).size;
        
        // WebP 형식으로 최적화 (우선)
        await sharp(inputPath)
            .resize(OPTIMIZATION_CONFIG.resize)
            .webp(OPTIMIZATION_CONFIG.webp)
            .toFile(webpPath);
        
        // JPEG/PNG 최적화 (fallback용)
        const ext = path.extname(filename).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg') {
            await sharp(inputPath)
                .resize(OPTIMIZATION_CONFIG.resize)
                .jpeg(OPTIMIZATION_CONFIG.jpeg)
                .toFile(outputPath);
        } else if (ext === '.png') {
            await sharp(inputPath)
                .resize(OPTIMIZATION_CONFIG.resize)
                .png(OPTIMIZATION_CONFIG.png)
                .toFile(outputPath);
        }
        
        // 최적화 결과 확인
        const webpSize = fs.statSync(webpPath).size;
        const compressionRatio = ((originalSize - webpSize) / originalSize * 100).toFixed(1);
        
        console.log(`✅ ${filename}: ${(originalSize/1024).toFixed(1)}KB → ${(webpSize/1024).toFixed(1)}KB (${compressionRatio}% 압축)`);
        
    } catch (error) {
        console.error(`Error ${filename} 최적화 실패:`, error.message);
    }
}

async function processDirectory(inputDir, outputDir) {
    const items = fs.readdirSync(inputDir);
    
    for (const item of items) {
        const inputPath = path.join(inputDir, item);
        const stat = fs.statSync(inputPath);
        
        if (stat.isDirectory()) {
            // 하위 디렉토리 처리
            const subOutputDir = path.join(outputDir, item);
            await ensureDir(subOutputDir);
            await processDirectory(inputPath, subOutputDir);
        } else if (/\.(jpg|jpeg|png)$/i.test(item)) {
            // 이미지 파일 최적화
            await optimizeImage(inputPath, outputDir, item);
        }
    }
}

async function optimizeLogo() {
    console.log('로고 파일 최적화 중...');
    
    const logoPath = path.join(PUBLIC_DIR, 'logo.png');
    const optimizedLogoDir = path.join(PUBLIC_DIR, 'optimized');
    
    // 로고 파일이 존재하는지 확인
    if (!fs.existsSync(logoPath)) {
        console.log('[경고] logo.png 파일을 찾을 수 없습니다.');
        return;
    }
    
    // optimized 디렉토리 생성
    await ensureDir(optimizedLogoDir);
    
    try {
        await optimizeImage(logoPath, optimizedLogoDir, 'logo.png');
        console.log('[성공] 로고 최적화 완료!');
    } catch (error) {
        console.error('Error 로고 최적화 실패:', error);
    }
}

async function main() {
    console.log('이미지 최적화를 시작합니다...');
    
    // 최적화된 이미지 디렉토리 생성
    await ensureDir(OPTIMIZED_DIR);
    
    try {
        // 1. 게임 이미지들 최적화
        await processDirectory(IMAGES_DIR, OPTIMIZED_DIR);
        console.log('✅ 게임 이미지 최적화가 완료되었습니다!');
        
        // 2. 로고 파일 최적화
        await optimizeLogo();
        
        console.log(`최적화된 이미지는 ${OPTIMIZED_DIR}에 저장되었습니다.`);
        console.log(`최적화된 로고는 public/optimized/에 저장되었습니다.`);
        console.log('production에서는 최적화된 파일들을 사용하세요.');
    } catch (error) {
        console.error('Error 이미지 최적화 중 오류 발생:', error);
    }
}

main(); 