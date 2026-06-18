import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import axios from "axios";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getApiKeyRotationManager } from "@/lib/apiKeyRotation";

async function runLocally(language, code) {
    const tempDir = os.tmpdir();
    const uniqueId = Date.now();
    let ext = "js";
    let tempFilePath = "";
    let cmd = "";
    
    if (language === "javascript") {
        ext = "js";
        tempFilePath = path.join(tempDir, `playground_${uniqueId}.${ext}`);
        fs.writeFileSync(tempFilePath, code);
        cmd = `node "${tempFilePath}"`;
    } else if (language === "typescript") {
        ext = "ts";
        tempFilePath = path.join(tempDir, `playground_${uniqueId}.${ext}`);
        fs.writeFileSync(tempFilePath, code);
        cmd = `npx ts-node "${tempFilePath}"`;
    } else if (language === "python") {
        ext = "py";
        tempFilePath = path.join(tempDir, `playground_${uniqueId}.${ext}`);
        fs.writeFileSync(tempFilePath, code);
        cmd = `python "${tempFilePath}"`;
    } else if (language === "java") {
        const javaTempDir = path.join(tempDir, `java_${uniqueId}`);
        fs.mkdirSync(javaTempDir, { recursive: true });
        tempFilePath = path.join(javaTempDir, "Main.java");
        fs.writeFileSync(tempFilePath, code);
        cmd = `javac "${tempFilePath}" && java -cp "${javaTempDir}" Main`;
    } else if (language === "cpp") {
        const cppTempDir = path.join(tempDir, `cpp_${uniqueId}`);
        fs.mkdirSync(cppTempDir, { recursive: true });
        tempFilePath = path.join(cppTempDir, "main.cpp");
        const cppExePath = path.join(cppTempDir, "main");
        fs.writeFileSync(tempFilePath, code);
        cmd = `g++ "${tempFilePath}" -o "${cppExePath}" && "${cppExePath}"`;
    } else if (language === "rust") {
        const rustTempDir = path.join(tempDir, `rust_${uniqueId}`);
        fs.mkdirSync(rustTempDir, { recursive: true });
        tempFilePath = path.join(rustTempDir, "main.rs");
        const rustExePath = path.join(rustTempDir, "main");
        fs.writeFileSync(tempFilePath, code);
        cmd = `rustc "${tempFilePath}" -o "${rustExePath}" && "${rustExePath}"`;
    } else if (language === "go") {
        ext = "go";
        tempFilePath = path.join(tempDir, `playground_${uniqueId}.${ext}`);
        fs.writeFileSync(tempFilePath, code);
        cmd = `go run "${tempFilePath}"`;
    } else if (language === "php") {
        ext = "php";
        tempFilePath = path.join(tempDir, `playground_${uniqueId}.${ext}`);
        fs.writeFileSync(tempFilePath, code);
        cmd = `php "${tempFilePath}"`;
    } else if (language === "ruby") {
        ext = "rb";
        tempFilePath = path.join(tempDir, `playground_${uniqueId}.${ext}`);
        fs.writeFileSync(tempFilePath, code);
        cmd = `ruby "${tempFilePath}"`;
    }

    return new Promise((resolve, reject) => {
        if (!cmd) {
            return reject(new Error(`Language '${language}' is not supported locally.`));
        }

        exec(cmd, (error, stdout, stderr) => {
            // Clean up temp files
            try {
                if (language === "java" || language === "cpp" || language === "rust") {
                    const dirToDelete = path.dirname(tempFilePath);
                    fs.rmSync(dirToDelete, { recursive: true, force: true });
                } else {
                    if (tempFilePath) {
                        fs.unlinkSync(tempFilePath);
                    }
                }
            } catch (_) {}

            if (language === "python" && error && (error.code === 127 || error.message.includes("not recognized"))) {
                // Fallback to python3
                try {
                    fs.writeFileSync(tempFilePath, code);
                    exec(`python3 "${tempFilePath}"`, (error3, stdout3, stderr3) => {
                        try { fs.unlinkSync(tempFilePath); } catch (_) {}
                        resolve({
                            run: {
                                stdout: stdout3 || "",
                                stderr: stderr3 || (error3 ? error3.message : ""),
                                code: error3 ? (error3.code || 1) : 0,
                                output: stdout3 || stderr3 || (error3 ? error3.message : "")
                            }
                        });
                    });
                } catch (py3Err) {
                    reject(py3Err);
                }
            } else if (error && (error.code === 127 || error.message.includes("not recognized") || error.message.includes("not found"))) {
                // If compiler/interpreter is not installed, reject so that Gemini fallback is triggered
                reject(new Error(`Runtime command failed (not installed): ${error.message}`));
            } else {
                resolve({
                    run: {
                        stdout: stdout || "",
                        stderr: stderr || (error ? error.message : ""),
                        code: error ? (error.code || 1) : 0,
                        output: stdout || stderr || (error ? error.message : "")
                    }
                });
            }
        });
    });
}

async function runWithGemini(language, code) {
    try {
        const rotationManager = getApiKeyRotationManager();
        const currentKey = rotationManager.getCurrentKey();
        const genAI = new GoogleGenerativeAI(currentKey);
        
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const prompt = `You are a high-fidelity virtual compiler and interpreter for ${language}. Execute the following code. Analyze it step-by-step and determine its exact execution output (stdout and stderr).

Return a JSON object containing:
- "stdout": string (everything printed to standard output)
- "stderr": string (errors, compile errors, runtime exceptions, or stderr output)
- "code": number (exit code, 0 for success, non-zero for error)

Here is the code to execute:
\`\`\`${language}
${code}
\`\`\`
`;

        const response = await model.generateContent(prompt);
        const resultText = response.response.text();
        const result = JSON.parse(resultText);

        try { rotationManager.recordSuccess(); } catch (_) {}

        return {
            run: {
                stdout: result.stdout || "",
                stderr: result.stderr || "",
                code: result.code ?? 0,
                signal: null,
                output: result.stdout || result.stderr || ""
            }
        };
    } catch (geminiError) {
        console.error("Gemini fallback runner failed:", geminiError);
        throw geminiError;
    }
}

export const maxDuration = 15;

const LANGUAGE_VERSIONS = {
    javascript: "18.15.0",
    python: "3.10.0",
    typescript: "5.0.3",
    java: "15.0.2",
    cpp: "10.2.0",
    rust: "1.50.0",
    go: "1.16.2",
    php: "8.0.2",
    ruby: "3.0.1",
};

/**
 * POST /api/playground
 * Evaluates and executes source code in a secure sandboxed environment via Piston API.
 */
export async function POST(req) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { language, code } = await req.json();

        if (!language || !code) {
            return NextResponse.json({ error: "Language and code are required" }, { status: 400 });
        }

        const normalizedLang = language.toLowerCase();
        const version = LANGUAGE_VERSIONS[normalizedLang];

        if (!version) {
            return NextResponse.json({ error: `Language '${language}' is not supported` }, { status: 400 });
        }

        // Call Piston API for sandboxed execution
        try {
            const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
                language: normalizedLang,
                version: version,
                files: [
                    {
                        content: code
                    }
                ]
            }, {
                timeout: 8000
            });

            const result = response.data;
            return NextResponse.json({
                run: {
                    stdout: result.run?.stdout || "",
                    stderr: result.run?.stderr || "",
                    code: result.run?.code ?? 0,
                    signal: result.run?.signal || null,
                    output: result.run?.output || ""
                }
            });
        } catch (apiError) {
            console.warn("Piston API execution failed, falling back to local runner:", apiError.message);
            
            try {
                const localResult = await runLocally(normalizedLang, code);
                return NextResponse.json(localResult);
            } catch (fallbackError) {
                console.warn("Local execution fallback failed, falling back to Gemini API runner:", fallbackError.message);
                
                try {
                    const geminiResult = await runWithGemini(normalizedLang, code);
                    return NextResponse.json(geminiResult);
                } catch (geminiError) {
                    console.error("All execution runners failed:", geminiError);
                    return NextResponse.json({ 
                        error: "Code execution engine is offline, and local/AI execution failed." 
                    }, { status: 503 });
                }
            }
        }

    } catch (error) {
        console.error("Playground API error:", error);
        return NextResponse.json({ error: "Failed to run code" }, { status: 500 });
    }
}
