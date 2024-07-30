const { program } = require('commander');
const fs = require('fs').promises;

class OllamaResponse {
    constructor(data) {
        this.model = data.model;
        this.created_at = new Date(data.created_at);
        this.response = data.response;
        this.done = data.done;
        this.total_duration = data.total_duration;
        this.load_duration = data.load_duration || 0;
        this.prompt_eval_count = data.prompt_eval_count;
        this.prompt_eval_duration = data.prompt_eval_duration;
        this.eval_count = data.eval_count;
        this.eval_duration = data.eval_duration;
    }
}

async function runBenchmark(modelName, prompt, verbose) {
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelName, prompt: prompt, stream: false }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (verbose) {
            console.log(`Model: ${modelName}, Prompt: "${prompt}"`);
            console.log(`Response: ${data.response}\n`);
        }

        return new OllamaResponse(data);
    } catch (error) {
        console.error(`Error benchmarking ${modelName}: ${error.message}`);
        return null;
    }
}

function nanosecToSec(nanosec) {
    return nanosec / 1e9;
}

async function getBenchmarkModels(skipModels = []) {
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const modelNames = data.models.map(model => model.name);
        const filteredModelNames = skipModels.length ? modelNames.filter(model => !skipModels.includes(model)) : modelNames;
        console.log(`Evaluating models: ${filteredModelNames.join(', ')}\n`);
        return filteredModelNames;
    } catch (error) {
        console.error(`Error fetching models: ${error.message}`);
        return [];
    }
}

function calculateStats(response) {
    const promptTokensPerSecond = response.prompt_eval_count / (response.prompt_eval_duration / 1e9);
    const responseTokensPerSecond = response.eval_count / (response.eval_duration / 1e9);
    const totalTokensPerSecond = (response.prompt_eval_count + response.eval_count) /
        ((response.prompt_eval_duration + response.eval_duration) / 1e9);

    return {
        promptTokensPerSecond,
        responseTokensPerSecond,
        totalTokensPerSecond,
        totalTokens: response.prompt_eval_count + response.eval_count,
        totalDuration: response.total_duration / 1e9
    };
}

function averageStats(responses) {
    const stats = responses.map(calculateStats);
    const avgStats = {
        promptTokensPerSecond: (stats.reduce((sum, s) => sum + s.promptTokensPerSecond, 0) / stats.length).toFixed(2),
        responseTokensPerSecond: (stats.reduce((sum, s) => sum + s.responseTokensPerSecond, 0) / stats.length).toFixed(2),
        totalTokensPerSecond: (stats.reduce((sum, s) => sum + s.totalTokensPerSecond, 0) / stats.length).toFixed(2),
        totalTokens: (stats.reduce((sum, s) => sum + s.totalTokens, 0) / stats.length).toFixed(2),
        totalDuration: (stats.reduce((sum, s) => sum + s.totalDuration, 0) / stats.length).toFixed(2)
    };

    console.log(`Average Stats:
    Prompt Tokens/s: ${avgStats.promptTokensPerSecond}
    Response Tokens/s: ${avgStats.responseTokensPerSecond}
    Total Tokens/s: ${avgStats.totalTokensPerSecond}
    Avg Total Tokens: ${avgStats.totalTokens}
    Avg Total Duration: ${avgStats.totalDuration}s
    `);

    return avgStats;
}

program
    .option('-v, --verbose', 'Increase output verbosity', false)
    .option('-s, --skip-models <models...>', 'List of model names to skip', [])
    .option('-p, --prompts <prompts...>', 'List of prompts to use for benchmarking', [])
    .option('-c, --config <path>', 'Path to optional configuration file')
    .option('-o, --output <path>', 'Path to save benchmark results', 'benchmark_results.json');

program.parse(process.argv);

async function loadConfig(configPath) {
    if (!configPath) return {};

    try {
        const config = await fs.readFile(configPath, 'utf8');
        return JSON.parse(config);
    } catch (error) {
        console.warn(`Failed to load config file: ${error.message}. Using command line options.`);
        return {};
    }
}

(async function main() {
    try {
        const options = program.opts();
        const config = options.config ? await loadConfig(options.config) : {};

        const verbose = options.verbose;
        const skipModels = options.skipModels.length > 0 ? options.skipModels : config.skipModels || [];
        const prompts = options.prompts.length > 0 ? options.prompts : config.prompts || ['Why is the sky blue?'];

        console.log(`\nVerbose: ${verbose}\nSkip models: ${skipModels.join(', ')}\nPrompts: ${prompts.join(', ')}`);
        const modelNames = await getBenchmarkModels(skipModels);
        if (modelNames.length === 0) {
            console.error("No models available for benchmarking. Exiting.");
            process.exit(1);
        }

        const benchmarks = {};

        for (const modelName of modelNames) {
            const responses = [];
            for (const prompt of prompts) {
                const response = await runBenchmark(modelName, prompt, verbose);
                if (response) {
                    responses.push(response);
                }
            }
            benchmarks[modelName] = responses;
        }

        const results = {};
        for (const [modelName, responses] of Object.entries(benchmarks)) {
            if (responses.length > 0) {
                console.log(`\nResults for ${modelName}:`);
                results[modelName] = averageStats(responses);
            } else {
                console.log(`\nNo valid responses for ${modelName}`);
                results[modelName] = null;
            }
        }

        await fs.writeFile(options.output, JSON.stringify(results, null, 2));
        console.log(`\nBenchmark results saved to ${options.output}`);
    } catch (error) {
        console.error(`An error occurred during benchmarking: ${error.message}`);
        process.exit(1);
    }
})();