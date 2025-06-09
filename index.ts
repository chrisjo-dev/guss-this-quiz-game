import express, { Express, Request, Response } from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';

const app: Express = express();
const PORT = process.env.PORT || 3000;

app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        return compression.filter(req, res);
    }
}));

// 이미지 최적화 전략: kpop-stars는 원본, 나머지는 최적화된 이미지 사용
const optimizedImagesPath = path.join(__dirname, 'public', 'images-optimized');
const originalImagesPath = path.join(__dirname, 'public', 'images');

// kpop-stars는 원본 이미지 사용 (고화질 필요)
app.use('/images/kpop-stars', express.static(path.join(originalImagesPath, 'kpop-stars'), {
    maxAge: '1y', // 이미지 캐싱 1년
    etag: true,
    lastModified: true
}));

// 나머지는 최적화된 이미지 사용
if (fs.existsSync(optimizedImagesPath)) {
    app.use('/images', express.static(optimizedImagesPath, {
        maxAge: '1y', // 이미지 캐싱 1년
        etag: true,
        lastModified: true
    }));
} else {
    console.log('최적화된 이미지가 없습니다. 모든 이미지를 원본으로 사용합니다.');
    app.use('/images', express.static(originalImagesPath, {
        maxAge: '1y', // 이미지 캐싱 1년
        etag: true,
        lastModified: true
    }));
}

app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let contentsData: any = {};
try {
    const rawData = fs.readFileSync('contents.json', 'utf8');
    contentsData = JSON.parse(rawData);
} catch (error) {}

const topicMapping: Record<string, string> = {
    'global-celebrities': 'global_celebrities',
    'korean-celebrities': 'korean_celebrities', 
    'kpop-stars': 'kpop_stars',
    'history': 'historical_figures',
    'animals': 'animals',
    'dog-breeds': 'dog_breeds',
    'flags': 'flags',
    'capitals': 'capitals'
};

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

function convertToPersonObjects(topic: string, data: any[]): PersonObject[] {
    return data.filter(item => {
        const name = topic === 'capitals' ? item.capital : item;
        const searchName = topic === 'capitals' ? item.country : name;
        
        const imageTopicDir = topic === 'capitals' ? 'flags' : 
                             topic === 'history' ? 'historical-figures' :
                             topic === 'kpop-stars' ? 'kpop-stars' :
                             topic === 'dog-breeds' ? 'dog-breeds' : topic;
        
        if (topic === 'capitals' && !searchName) {
            return false;
        }
        
        let patterns = [
            searchName.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').toLowerCase(),
            searchName.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').toLowerCase().replace(/^./, str => str.toUpperCase()),
            searchName.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').replace(/^./, str => str.toUpperCase()) + '_' + searchName,
            searchName.split(' ')[0] ? searchName.split(' ')[0].replace(/[^\w]/g, '').replace(/^./, str => str.toUpperCase()) : searchName,
        ];
        
        if (topic === 'kpop-stars') {
            const match = searchName.match(/^([^(]+)\s*\(([^)]+)\)$/);
            if (match) {
                const englishPart = match[1].trim().replace(/\s+/g, '_').toLowerCase();
                const koreanPart = match[2].trim();
                patterns.unshift(`${englishPart}_${koreanPart}`);
            }
        }
        
        for (let pattern of patterns) {
            const imagePath = path.join(__dirname, 'public', 'images', imageTopicDir, `${pattern}.jpg`);
            if (fs.existsSync(imagePath)) {
                return true;
            }
        }
        
        try {
            const imageDir = path.join(__dirname, 'public', 'images', imageTopicDir);
            const files = fs.readdirSync(imageDir);
            const fileSearchName = searchName.toLowerCase().replace(/\s+/g, '_');
            
            return files.some(file => {
                const fileNameLower = file.toLowerCase();
                return fileNameLower.startsWith(fileSearchName) || 
                       fileNameLower.startsWith(fileSearchName.replace(/_/g, ''));
            });
        } catch (error) {
            return false;
        }
    }).map(item => {
        const name = topic === 'capitals' ? item.capital : item;
        const searchName = topic === 'capitals' ? item.country : name;
        
        const imageTopicDir = topic === 'capitals' ? 'flags' : 
                             topic === 'history' ? 'historical-figures' :
                             topic === 'kpop-stars' ? 'kpop-stars' :
                             topic === 'dog-breeds' ? 'dog-breeds' : topic;
        
        let patterns = [
            searchName.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').toLowerCase(),
            searchName.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').toLowerCase().replace(/^./, str => str.toUpperCase()),
            searchName.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_').replace(/^./, str => str.toUpperCase()) + '_' + searchName,
            searchName.split(' ')[0] ? searchName.split(' ')[0].replace(/[^\w]/g, '').replace(/^./, str => str.toUpperCase()) : searchName,
        ];
        
        if (topic === 'kpop-stars') {
            const match = searchName.match(/^([^(]+)\s*\(([^)]+)\)$/);
            if (match) {
                const englishPart = match[1].trim().replace(/\s+/g, '_').toLowerCase();
                const koreanPart = match[2].trim();
                patterns.unshift(`${englishPart}_${koreanPart}`);
            }
        }
        
        let actualFilename: string | null = null;
        
        for (let pattern of patterns) {
            const imagePath = path.join(__dirname, 'public', 'images', imageTopicDir, `${pattern}.jpg`);
            if (fs.existsSync(imagePath)) {
                actualFilename = `${pattern}.jpg`;
                break;
            }
        }
        
        if (!actualFilename) {
            try {
                const imageDir = path.join(__dirname, 'public', 'images', imageTopicDir);
                const files = fs.readdirSync(imageDir);
                const fileSearchName = searchName.toLowerCase().replace(/\s+/g, '_');
                
                actualFilename = files.find(file => {
                    const fileNameLower = file.toLowerCase();
                    return fileNameLower.startsWith(fileSearchName) || 
                           fileNameLower.startsWith(fileSearchName.replace(/_/g, ''));
                }) || null;
            } catch (error) {}
        }
        
        let koreanName: string | null = null;
        if ((topic === 'korean-celebrities' || topic === 'kpop-stars') && actualFilename) {
            const match = actualFilename.match(/(.+)_(.+)\.jpg$/);
            if (match && match[2]) {
                koreanName = match[2];
            }
        }
        
        let countryName: string | null = null;
        if (topic === 'capitals') {
            countryName = searchName;
        }
        
        return {
            name: name,
            koreanName: koreanName,
            countryName: countryName,
            image: `/images/${imageTopicDir}/${actualFilename || 'placeholder.jpg'}`
        };
    });
}

app.get('/api/persons/:topic', (req, res) => {
    const topic = req.params.topic;
    const jsonKey = topicMapping[topic];
    
    if (jsonKey && contentsData[jsonKey]) {
        const data = topic === 'capitals' ? contentsData[jsonKey] : contentsData[jsonKey];
        const personObjects = convertToPersonObjects(topic, data);
        res.json(personObjects);
    } else {
        res.json([]);
    }
});

app.get('/api/persons', (req, res) => {
    const jsonKey = topicMapping['global-celebrities'];
    if (jsonKey && contentsData[jsonKey]) {
        const personObjects = convertToPersonObjects('global-celebrities', contentsData[jsonKey]);
        res.json(personObjects);
    } else {
        res.json([]);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running successfully on port ${PORT}`);
});