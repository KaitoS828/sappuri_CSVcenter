import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Convert file to base64
        const buffer = await file.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString('base64');
        const mimeType = file.type;

        // Use Gemini 2.0 Flash (Experimental) per user "Gemini 3" request
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        console.log(`Processing file: ${file.name}, Type: ${mimeType}, Size: ${base64Data.length}`);

        const prompt = `
      Please analyze the attached application form. 
      The document may contain MULTIPLE pages. Each page represents a separate application.
      Extract the following information from EACH page and return them as a JSON ARRAY of objects.
      
      Fields to extract per page:
      - name (Name of the person)
      - furigana (Reading of the name)
      - gender (1 for Male, 2 for Female, 0 for Unknown/Other)
      - dobYear (Year of Birth, 4 digits)
      - dobMonth (Month of Birth, 1-12)
      - dobDay (Day of Birth, 1-31)
      - address (Full Address including prefecture, city, street, building)
      - postalCode (Postal Code - if missing, try to infer from address or leave blank)
      - phone (Phone Number)
      - occupation (Job/Occupation)
      - cardNumber (8-digit number found on receipt, if attached)
      
      Return ONLY the JSON ARRAY, no markdown formatting.
      If a field is not found or illegible, set it to an empty string.
      
      Example JSON Structure:
      [
        {
          "name": "...",
          "furigana": "...",
          "gender": "1",
          "dobYear": "1990",
          "dobMonth": "1",
          "dobDay": "1",
          "address": "...",
          "postalCode": "...",
          "phone": "...",
          "occupation": "...",
          "cardNumber": "..."
        },
        {
          "name": "...",
          ...
        }
      ]
    `;

        // Fallback Logic: Try Gemini 3 first, then Gemini 2.0
        let result;
        try {
            console.log("Attempting with model: gemini-3-flash-preview");
            const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
            result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType,
                    },
                },
            ]);
        } catch (error) {
            console.warn("Gemini 3 failed, falling back to gemini-2.0-flash-exp. Error:", error);
            console.log("Attempting with model: gemini-2.0-flash-exp");
            const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            result = await fallbackModel.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType,
                    },
                },
            ]);
        }

        const responseText = result.response.text();

        // Clean up response if it contains markdown code blocks
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        let parsedData;
        try {
            parsedData = JSON.parse(jsonString);
            // Ensure result is always an array
            if (!Array.isArray(parsedData)) {
                parsedData = [parsedData];
            }
            parsedData = parsedData.map((item: any) => ({
                name: item.name || "",
                furigana: item.furigana || "",
                gender: item.gender || "0",
                dobYear: item.dobYear || "",
                dobMonth: item.dobMonth || "",
                dobDay: item.dobDay || "",
                postalCode: item.postalCode || "",
                address: item.address || "",
                phone: item.phone || "",
                occupation: item.occupation || "",
                cardNumber: item.cardNumber || ""
            }));
        } catch (e) {
            console.error("Failed to parse JSON:", responseText, e);
            return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
        }

        return NextResponse.json(parsedData);

    } catch (error) {
        console.error('Error processing document:', error);
        return NextResponse.json(
            { error: 'Internal server error processing document' },
            { status: 500 }
        );
    }
}
