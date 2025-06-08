import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// 정적 파일 미들웨어 - 보안: public 폴더만 제공
app.use(express.static(path.join(__dirname, 'public')));

// 메인 페이지 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// JSON 파일에서 콘텐츠 로드
let contentsData: any = {};
try {
    const rawData = fs.readFileSync('contents.json', 'utf8');
    contentsData = JSON.parse(rawData);
    console.log('✅ contents.json 파일을 성공적으로 로드했습니다');
} catch (error) {
    console.error('❌ contents.json 로딩 중 오류 발생:', error);
}

// JSON 키를 URL 친화적인 토픽 이름으로 매핑 (준비된 이미지가 있는 것만)
const topicMapping: Record<string, string> = {
    'global-celebrities': 'global_celebrities',
    'korean-celebrities': 'korean_celebrities', 
    'history': 'historical_figures',
    'animals': 'animals',
    'flags': 'flags',
    'capitals': 'capitals'
};

// contents.json에서 수도-국가 매핑 생성 함수
function getCountryByCapital(capital: string): string | null {
    if (!contentsData.capitals || !Array.isArray(contentsData.capitals)) {
        return null;
    }
    
    const found = contentsData.capitals.find((item: any) => 
        item.capital === capital
    );
    
    return found ? found.country : null;
}

interface PersonObject {
    name: string;
    koreanName?: string | null;
    countryName?: string | null;
    image: string;
}

// 문자열 배열을 이미지 경로가 포함된 인물 객체로 변환 (이미지가 있는 경우만)
function convertToPersonObjects(topic: string, data: any[]): PersonObject[] {
    return data.filter(item => {
        // capitals는 객체 배열이므로 다르게 처리
        const name = topic === 'capitals' ? item.capital : item;
        const searchName = topic === 'capitals' ? item.country : name;
        
        // capitals는 flags 이미지를 사용
        const imageTopicDir = topic === 'capitals' ? 'flags' : topic;
        
        if (topic === 'capitals' && !searchName) {
            console.log(`⚠️  수도 ${name}에 대한 국가를 찾을 수 없습니다`);
            return false;
        }
        
        // 여러 파일명 패턴 시도
        const patterns = [
            // 기본 패턴: jungkook.jpg
            searchName.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').toLowerCase(),
            // 첫글자 대문자 패턴: Jungkook.jpg  
            searchName.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').toLowerCase().replace(/^./, str => str.toUpperCase()),
            // 한영 조합 패턴: Jungkook_정국.jpg
            searchName.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').replace(/^./, str => str.toUpperCase()) + '_' + searchName,
            // 영어만 대문자: Jungkook_정국.jpg (영어 부분만)
            searchName.split(' ')[0] ? searchName.split(' ')[0].replace(/[^\w]/g, '').replace(/^./, str => str.toUpperCase()) : searchName,
        ];
        
        // 각 패턴으로 파일 존재 확인
        for (let pattern of patterns) {
            const imagePath = path.join(__dirname, 'public', 'images', imageTopicDir, `${pattern}.jpg`);
            if (fs.existsSync(imagePath)) {
                return true;
            }
        }
        
        // 실제 디렉토리에서 파일 검색 (마지막 수단) - 더 정확한 매칭
        try {
            const imageDir = path.join(__dirname, 'public', 'images', imageTopicDir);
            const files = fs.readdirSync(imageDir);
            const fileSearchName = searchName.toLowerCase().replace(/\s+/g, '_');
            
            return files.some(file => {
                const fileNameLower = file.toLowerCase();
                // 정확한 매칭만 허용 (부분 매칭 방지)
                return fileNameLower.startsWith(fileSearchName) || 
                       fileNameLower.startsWith(fileSearchName.replace(/_/g, ''));
            });
        } catch (error) {
            console.log(`⚠️  이미지를 찾을 수 없습니다: ${name}`);
            return false;
        }
    }).map(item => {
        // capitals는 객체 배열이므로 다르게 처리
        const name = topic === 'capitals' ? item.capital : item;
        const searchName = topic === 'capitals' ? item.country : name;
        
        // capitals는 flags 이미지를 사용
        const imageTopicDir = topic === 'capitals' ? 'flags' : topic;
        
        // 실제 파일명 찾기
        const patterns = [
            searchName.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').toLowerCase(),
            searchName.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').toLowerCase().replace(/^./, str => str.toUpperCase()),
            searchName.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').replace(/^./, str => str.toUpperCase()) + '_' + searchName,
            searchName.split(' ')[0] ? searchName.split(' ')[0].replace(/[^\w]/g, '').replace(/^./, str => str.toUpperCase()) : searchName,
        ];
        
        let actualFilename: string | null = null;
        
        for (let pattern of patterns) {
            const imagePath = path.join(__dirname, 'public', 'images', imageTopicDir, `${pattern}.jpg`);
            if (fs.existsSync(imagePath)) {
                actualFilename = `${pattern}.jpg`;
                break;
            }
        }
        
        // 디렉토리에서 직접 검색 - 더 정확한 매칭
        if (!actualFilename) {
            try {
                const imageDir = path.join(__dirname, 'public', 'images', imageTopicDir);
                const files = fs.readdirSync(imageDir);
                const fileSearchName = searchName.toLowerCase().replace(/\s+/g, '_');
                
                actualFilename = files.find(file => {
                    const fileNameLower = file.toLowerCase();
                    // 정확한 매칭만 허용 (부분 매칭 방지)
                    return fileNameLower.startsWith(fileSearchName) || 
                           fileNameLower.startsWith(fileSearchName.replace(/_/g, ''));
                }) || null;
            } catch (error) {
                console.log(`⚠️  파일명을 찾을 수 없습니다: ${name}`);
            }
        }
        
        // Korean celebrities의 경우 한국어 이름 추출
        let koreanName: string | null = null;
        if (topic === 'korean-celebrities' && actualFilename) {
            const match = actualFilename.match(/(.+)_(.+)\.jpg$/);
            if (match && match[2]) {
                koreanName = match[2]; // 파일명에서 한국어 부분 추출
            }
        }
        
        // capitals의 경우 국가 이름 추가
        let countryName: string | null = null;
        if (topic === 'capitals') {
            countryName = searchName; // 이미 위에서 item.country로 설정됨
        }
        
        return {
            name: name,
            koreanName: koreanName,
            countryName: countryName,
            image: `/images/${imageTopicDir}/${actualFilename || 'placeholder.jpg'}`
        };
    });
}

// 토픽별 인물 데이터를 가져오는 API 엔드포인트
app.get('/api/persons/:topic', (req, res) => {
    const topic = req.params.topic;
    const jsonKey = topicMapping[topic];
    
    if (jsonKey && contentsData[jsonKey]) {
        // capitals는 이미 객체 배열이므로 그대로 전달, 다른 토픽은 문자열 배열을 객체로 변환
        const data = topic === 'capitals' ? contentsData[jsonKey] : contentsData[jsonKey];
        const personObjects = convertToPersonObjects(topic, data);
        res.json(personObjects);
    } else {
        res.json([]);
    }
});

// 레거시 엔드포인트 (하위 호환성 유지)
app.get('/api/persons', (req, res) => {
    const jsonKey = topicMapping['global-celebrities'];
    if (jsonKey && contentsData[jsonKey]) {
        const personObjects = convertToPersonObjects('global-celebrities', contentsData[jsonKey]);
        res.json(personObjects);
    } else {
        res.json([]);
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 Bun + TypeScript: Guess This Quiz Game 서버가 http://localhost:${PORT}에서 실행 중입니다`);
    console.log(`📁 public 디렉토리에서 정적 파일 제공 중`);
    console.log(`🖼️  /images/에서 이미지 사용 가능`);
    console.log(`⚡ Hot reload enabled with --watch`);
}); 