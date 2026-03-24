// Card storage in memory
let cardImages = new Map(); // Map of card name -> {front: blob, back: blob | null}
let cardList = new Map(); // Map of card name -> quantity

// Parse card list from textarea
function parseCardList(text) {
    const cards = new Map();
    const lines = text.trim().split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        const parts = trimmed.split(' ');
        let quantity = 1;
        let cardName = trimmed;
        
        if (parts[0] && !isNaN(parts[0])) {
            quantity = parseInt(parts[0]);
            cardName = parts.slice(1).join(' ');
        }
        
        if (cards.has(cardName)) {
            cards.set(cardName, cards.get(cardName) + quantity);
        } else {
            cards.set(cardName, quantity);
        }
    }
    
    return cards;
}

// Search Scryfall for card data
async function scryfallCardSearch(cardName) {
    const url = `https://api.scryfall.com/cards/search?q=!"${cardName}" prefer:newest game:paper not:showcase not:boosterfun -s:sld -s:plst -s:mb2 not:promo not:memorabilia not:serialized`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Scryfall API error: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.data && data.data.length > 0) {
            return data.data[0];
        }
        return null;
    } catch (error) {
        console.error(`Error searching for "${cardName}":`, error);
        return null;
    }
}

// Normalize card name for URL (remove special characters, replace spaces with hyphens)
function normalizeCardName(cardName) {
    return cardName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase();
}

// Convert language code format (de-de -> de, en-us -> en, etc.)
function convertLangCode(langCode) {
    const langMap = {
        'de-de': 'de',
        'en-us': 'en',
        'es-es': 'es',
        'fr-fr': 'fr',
        'it-it': 'it',
        'ja-jp': 'ja',
        'ko-kr': 'ko',
        'pt-br': 'pt',
        'ru-ru': 'ru',
        'zh-cn': 'zhs',
        'zh-tw': 'zht'
    };
    return langMap[langCode] || 'en';
}

// Get card images from Scryfall with language support
async function getCardImages(cardName, langCode) {
    try {
        // First, get card data from Scryfall
        const cardData = await scryfallCardSearch(cardName);
        if (!cardData) {
            throw new Error(`Card "${cardName}" not found on Scryfall`);
        }
        
        // Convert language code to Scryfall format
        const scryfallLang = convertLangCode(langCode);
        
        // Try to get the language-specific printing
        let languageCard = cardData;
        if (scryfallLang !== 'en') {
            try {
                const printsUrl = `https://api.scryfall.com/cards/search?q=!"${cardName}" lang:${scryfallLang} prefer:newest game:paper not:showcase not:boosterfun -s:sld -s:plst -s:mb2 not:promo not:memorabilia not:serialized`;
                const printsResponse = await fetch(printsUrl);
                if (printsResponse.ok) {
                    const printsData = await printsResponse.json();
                    if (printsData.data && printsData.data.length > 0) {
                        languageCard = printsData.data[0];
                    }
                }
            } catch (error) {
                console.warn(`Could not find ${scryfallLang} version, using English:`, error);
            }
        }
        
        // Get image URIs
        let imageUris = languageCard.image_uris;
        
        // If card has multiple faces (double-faced cards)
        let backImageUri = null;
        if (languageCard.card_faces && languageCard.card_faces.length > 1) {
            imageUris = languageCard.card_faces[0].image_uris;
            backImageUri = languageCard.card_faces[1].image_uris?.large || languageCard.card_faces[1].image_uris?.normal;
        }
        
        // Download front image
        const frontImageUrl = imageUris?.large || imageUris?.normal || imageUris?.png;
        if (!frontImageUrl) {
            throw new Error(`No image URL found for "${cardName}"`);
        }
        
        const frontBlob = await downloadImage(frontImageUrl);
        const result = { front: frontBlob, back: null };
        
        // Download back image if exists
        if (backImageUri) {
            result.back = await downloadImage(backImageUri);
        }
        
        return result;
    } catch (error) {
        console.error(`Error fetching images for "${cardName}":`, error);
        throw error;
    }
}

// Download image and return as blob
async function downloadImage(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
    }
    return await response.blob();
}

// Update progress display
function updateProgress(containerId, message, isError = false) {
    const container = document.getElementById(containerId);
    const p = document.createElement('p');
    p.textContent = message;
    if (isError) {
        p.style.color = 'red';
    }
    container.appendChild(p);
    container.scrollTop = container.scrollHeight;
}

// Download all card images
async function downloadAllImages() {
    const textarea = document.getElementById('cardList');
    const langCode = document.getElementById('langCode').value;
    const progressContainer = document.getElementById('downloadProgress');
    const generateBtn = document.getElementById('generatePdf');
    
    progressContainer.innerHTML = '';
    cardImages.clear();
    
    cardList = parseCardList(textarea.value);
    
    if (cardList.size === 0) {
        updateProgress('downloadProgress', 'Please enter at least one card name', true);
        return;
    }
    
    updateProgress('downloadProgress', `Starting download for ${cardList.size} unique cards...`);
    
    let downloaded = 0;
    let failed = 0;
    
    for (const [cardName, quantity] of cardList) {
        try {
            updateProgress('downloadProgress', `Downloading: ${cardName} (${quantity}x)...`);
            const images = await getCardImages(cardName, langCode);
            cardImages.set(cardName, images);
            downloaded++;
            updateProgress('downloadProgress', `✓ ${cardName} downloaded`);
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            failed++;
            updateProgress('downloadProgress', `✗ Failed to download ${cardName}: ${error.message}`, true);
        }
    }
    
    updateProgress('downloadProgress', `\n✅ Download complete: ${downloaded} succeeded, ${failed} failed`);
    
    if (downloaded > 0) {
        generateBtn.disabled = false;
    }
    
    displayImagePreview();
}

// Display downloaded images in preview
function displayImagePreview() {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '<h3>Downloaded Images:</h3>';
    
    for (const [cardName, images] of cardImages) {
        const card = document.createElement('div');
        card.className = 'card-preview';
        
        const title = document.createElement('h4');
        title.textContent = cardName;
        card.appendChild(title);
        
        if (images.front) {
            const frontImg = document.createElement('img');
            frontImg.src = URL.createObjectURL(images.front);
            frontImg.alt = `${cardName} (front)`;
            card.appendChild(frontImg);
        }
        
        if (images.back) {
            const backImg = document.createElement('img');
            backImg.src = URL.createObjectURL(images.back);
            backImg.alt = `${cardName} (back)`;
            card.appendChild(backImg);
        }
        
        preview.appendChild(card);
    }
}

// Generate PDF from downloaded images
async function generatePDF() {
    const progressContainer = document.getElementById('pdfProgress');
    progressContainer.innerHTML = '';
    
    if (cardImages.size === 0) {
        updateProgress('pdfProgress', 'No images downloaded. Please download images first.', true);
        return;
    }
    
    updateProgress('pdfProgress', 'Generating PDF...');
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter'
    });
    
    // Card dimensions in inches
    const CARD_WIDTH = 2.5;
    const CARD_HEIGHT = 3.5;
    const CARDS_PER_ROW = 3;
    const CARDS_PER_COLUMN = 3;
    const PAGE_WIDTH = 8.5;
    const PAGE_HEIGHT = 11;
    
    // Calculate margins
    const xMargin = (PAGE_WIDTH - (CARDS_PER_ROW * CARD_WIDTH)) / 2;
    const yMargin = (PAGE_HEIGHT - (CARDS_PER_COLUMN * CARD_HEIGHT)) / 2;
    
    // Draw grid lines
    function drawGridLines() {
        pdf.setDrawColor(200);
        pdf.setLineWidth(0.01);
        
        // Horizontal lines
        for (let i = 0; i <= CARDS_PER_COLUMN; i++) {
            const y = yMargin + i * CARD_HEIGHT;
            pdf.line(0, y, PAGE_WIDTH, y);
        }
        
        // Vertical lines
        for (let i = 0; i <= CARDS_PER_ROW; i++) {
            const x = xMargin + i * CARD_WIDTH;
            pdf.line(x, 0, x, PAGE_HEIGHT);
        }
    }
    
    let cardCount = 0;
    let firstPage = true;
    
    for (const [cardName, quantity] of cardList) {
        const images = cardImages.get(cardName);
        if (!images) continue;
        
        for (let i = 0; i < quantity; i++) {
            // Add front image
            const row = Math.floor(cardCount / CARDS_PER_ROW);
            const col = cardCount % CARDS_PER_ROW;
            
            if (row >= CARDS_PER_COLUMN) {
                drawGridLines();
                pdf.addPage();
                cardCount = 0;
                firstPage = false;
            }
            
            const x = xMargin + col * CARD_WIDTH;
            const y = yMargin + Math.floor(cardCount / CARDS_PER_ROW) * CARD_HEIGHT;
            
            const frontDataUrl = await blobToDataURL(images.front);
            pdf.addImage(frontDataUrl, 'JPEG', x, y, CARD_WIDTH, CARD_HEIGHT);
            cardCount++;
            
            // Add back image if it exists
            if (images.back) {
                const backRow = Math.floor(cardCount / CARDS_PER_ROW);
                const backCol = cardCount % CARDS_PER_ROW;
                
                if (backRow >= CARDS_PER_COLUMN) {
                    drawGridLines();
                    pdf.addPage();
                    cardCount = 0;
                }
                
                const backX = xMargin + backCol * CARD_WIDTH;
                const backY = yMargin + Math.floor(cardCount / CARDS_PER_ROW) * CARD_HEIGHT;
                
                const backDataUrl = await blobToDataURL(images.back);
                pdf.addImage(backDataUrl, 'JPEG', backX, backY, CARD_WIDTH, CARD_HEIGHT);
                cardCount++;
            }
        }
    }
    
    // Draw grid lines on final page
    drawGridLines();
    
    // Save PDF
    pdf.save('playtest_cards.pdf');
    updateProgress('pdfProgress', '✅ PDF generated successfully!');
}

// Convert blob to data URL
function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Event listeners
document.getElementById('downloadImages').addEventListener('click', downloadAllImages);
document.getElementById('generatePdf').addEventListener('click', generatePDF);
