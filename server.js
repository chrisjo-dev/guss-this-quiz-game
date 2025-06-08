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
    'flags': 'flags',
    'capitals': 'capitals'
};

// 국가명과 수도 매핑 (capitals용)
const countryCapitalMapping = {
    "Seoul": "South Korea", "Tokyo": "Japan", "Beijing": "China", "Washington D.C.": "United States", "London": "United Kingdom",
    "Paris": "France", "Berlin": "Germany", "Rome": "Italy", "Madrid": "Spain", "Moscow": "Russia",
    "Ottawa": "Canada", "Canberra": "Australia", "Brasilia": "Brazil", "New Delhi": "India", "Pretoria": "South Africa",
    "Cairo": "Egypt", "Ankara": "Turkey", "Athens": "Greece", "Stockholm": "Sweden", "Oslo": "Norway",
    "Copenhagen": "Denmark", "Helsinki": "Finland", "Reykjavik": "Iceland", "Lisbon": "Portugal", "Dublin": "Ireland",
    "Bern": "Switzerland", "Vienna": "Austria", "Brussels": "Belgium", "Amsterdam": "Netherlands", "Warsaw": "Poland",
    "Prague": "Czech Republic", "Budapest": "Hungary", "Bucharest": "Romania", "Sofia": "Bulgaria", "Kyiv": "Ukraine",
    "Zagreb": "Croatia", "Belgrade": "Serbia", "Ljubljana": "Slovenia", "Bratislava": "Slovakia", "Podgorica": "Montenegro",
    "Tirana": "Albania", "Skopje": "North Macedonia", "Sarajevo": "Bosnia and Herzegovina", "Chisinau": "Moldova", 
    "Riga": "Latvia", "Vilnius": "Lithuania", "Tallinn": "Estonia", "Minsk": "Belarus", "Yerevan": "Armenia", "Tbilisi": "Georgia",
    "Baku": "Azerbaijan", "Nur-Sultan": "Kazakhstan", "Tashkent": "Uzbekistan", "Bishkek": "Kyrgyzstan", "Dushanbe": "Tajikistan", 
    "Ashgabat": "Turkmenistan", "Ulaanbaatar": "Mongolia", "Hanoi": "Vietnam", "Bangkok": "Thailand", "Kuala Lumpur": "Malaysia",
    "Singapore": "Singapore", "Jakarta": "Indonesia", "Manila": "Philippines", "Naypyidaw": "Myanmar", "Phnom Penh": "Cambodia", 
    "Vientiane": "Laos", "Dhaka": "Bangladesh", "Islamabad": "Pakistan", "Colombo": "Sri Lanka", "Kathmandu": "Nepal",
    "Kabul": "Afghanistan", "Tehran": "Iran", "Baghdad": "Iraq", "Riyadh": "Saudi Arabia", "Abu Dhabi": "UAE", 
    "Doha": "Qatar", "Kuwait City": "Kuwait", "Muscat": "Oman", "Sana'a": "Yemen", "Damascus": "Syria",
    "Beirut": "Lebanon", "Jerusalem": "Israel", "Ramallah": "Palestine", "Amman": "Jordan", "Rabat": "Morocco", 
    "Algiers": "Algeria", "Tunis": "Tunisia", "Tripoli": "Libya", "Khartoum": "Sudan", "Addis Ababa": "Ethiopia",
    "Nairobi": "Kenya", "Dodoma": "Tanzania", "Kampala": "Uganda", "Kigali": "Rwanda", "Kinshasa": "Congo", 
    "Abuja": "Nigeria", "Accra": "Ghana", "Dakar": "Senegal", "Yaounde": "Cameroon", "Yamoussoukro": "Ivory Coast"
};

// 문자열 배열을 이미지 경로가 포함된 인물 객체로 변환 (이미지가 있는 경우만)
function convertToPersonObjects(topic, names) {
    return names.filter(name => {
        // capitals는 flags 이미지를 사용
        const imageTopicDir = topic === 'capitals' ? 'flags' : topic;
        const searchName = topic === 'capitals' ? countryCapitalMapping[name] : name;
        
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
    }).map(name => {
        // capitals는 flags 이미지를 사용
        const imageTopicDir = topic === 'capitals' ? 'flags' : topic;
        const searchName = topic === 'capitals' ? countryCapitalMapping[name] : name;
        
        // 실제 파일명 찾기
        const patterns = [
            searchName.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').toLowerCase(),
            searchName.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').toLowerCase().replace(/^./, str => str.toUpperCase()),
            searchName.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').replace(/^./, str => str.toUpperCase()) + '_' + searchName,
            searchName.split(' ')[0] ? searchName.split(' ')[0].replace(/[^\w]/g, '').replace(/^./, str => str.toUpperCase()) : searchName,
        ];
        
        let actualFilename = null;
        
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
                });
            } catch (error) {
                console.log(`⚠️  파일명을 찾을 수 없습니다: ${name}`);
            }
        }
        
        // Korean celebrities의 경우 한국어 이름 추출
        let koreanName = null;
        if (topic === 'korean-celebrities' && actualFilename) {
            const match = actualFilename.match(/(.+)_(.+)\.jpg$/);
            if (match && match[2]) {
                koreanName = match[2]; // 파일명에서 한국어 부분 추출
            }
        }
        
        // capitals의 경우 국가 이름 추가
        let countryName = null;
        if (topic === 'capitals') {
            countryName = countryCapitalMapping[name];
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