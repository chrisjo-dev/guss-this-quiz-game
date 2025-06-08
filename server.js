const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 정적 파일 미들웨어 - 보안: public 폴더만 제공
app.use(express.static(path.join(__dirname, 'public')));

// 메인 페이지 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const fs = require('fs');

// JSON 파일에서 콘텐츠 로드
let contentsData = {};
try {
    const rawData = fs.readFileSync('contents.json', 'utf8');
    contentsData = JSON.parse(rawData);
    console.log('✅ contents.json 파일을 성공적으로 로드했습니다');
} catch (error) {
    console.error('❌ contents.json 로딩 중 오류 발생:', error);
}

// JSON 키를 URL 친화적인 토픽 이름으로 매핑 (준비된 이미지가 있는 것만)
const topicMapping = {
    'global-celebrities': 'global_celebrities',
    'korean-celebrities': 'korean_celebrities', 
    'history': 'historical_figures',
    'animals': 'animals',
    'flags': 'flags'
};

// 문자열 배열을 이미지 경로가 포함된 인물 객체로 변환 (이미지가 있는 경우만)
function convertToPersonObjects(topic, names) {
    return names.filter(name => {
        // 파일 이름에 안전한 문자열 생성
        const filename = name.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').toLowerCase();
        const imagePath = path.join(__dirname, 'public', 'images', topic, `${filename}.jpg`);
        
        // 이미지 파일 존재 여부 확인
        try {
            return fs.existsSync(imagePath);
        } catch (error) {
            console.log(`⚠️  이미지를 찾을 수 없습니다: ${name} (${filename}.jpg)`);
            return false;
        }
    }).map(name => {
        // 파일 이름에 안전한 문자열 생성
        const filename = name.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').toLowerCase();
        return {
            name: name,
            image: `/images/${topic}/${filename}.jpg`
        };
    });
}

// 토픽별 인물 데이터를 가져오는 API 엔드포인트
app.get('/api/persons/:topic', (req, res) => {
    const topic = req.params.topic;
    const jsonKey = topicMapping[topic];
    
    if (jsonKey && contentsData[jsonKey]) {
        const personObjects = convertToPersonObjects(topic, contentsData[jsonKey]);
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
    console.log(`🎯 Guess This Quiz Game 서버가 http://localhost:${PORT}에서 실행 중입니다`);
    console.log(`📁 public 디렉토리에서 정적 파일 제공 중`);
    console.log(`🖼️  /images/에서 이미지 사용 가능`);
}); 