import path, {join} from "node:path"
import {spawn} from "node:child_process" 

const isWindows = process.platform === "win32"

function childPromise(child) {
	const err = []
	const out = []
	if (child.stdout) {
		child.stdout.on('data', d=> out.push(d.toString()))
		child.stderr.on('data', d=> err.push(d.toString()))	
	}
	return Object.assign(new Promise(function (fulfill, _reject) {
		let code, signal
		const handler = (_code, _signal) => {
			code = _code, signal = signal
			const result = {
				code,
				err: null,
				signal,
				stderr: err.join(''),
				stdout: out.join(''),
			}

			if (code === 0 && signal == null) fulfill(result)
			else {
				// console.error(result)
				_reject(Object.assign(new Error("Problem in child process"), result))
			}
		}

		child.on("close", handler)
		child.on("exit", handler)
		child.on("error", error => {
			_reject(Object.assign((error), {
				code,
				err: error,
				signal,
				stderr: err.join(''),
				stdout: out.join(''),
			}))
			if (child.exitCode == null) child.kill('SIGTERM')
			setTimeout(()=>{
				if (child.exitCode == null) child.kill('SIGKILL')
			}, 200)
		})
	}), {process: child})
}

// This returns a Promise augmented with a `process` field for raw
// access to the child process
// The promise resolves to an object with this structure
// {
// 	code? // exit code, if any
// 	signal? // signal recieved, if any
// 	stdout: string,
// 	stderr: string,
//  error?: the error caught, if any
// }
// On rejection, the Error is augmented with the same fields

const cwd = join(process.cwd(), "./foo")

const pathVarName = Object.keys(process.env).filter(k => /^path$/i.test(k))[0]

const env = {
	...process.env,
	[pathVarName]: (isWindows ? ".\\node_modules\\.bin;": "./node_modules/.bin:") + process.env[pathVarName]       
}

console.log(`${pathVarName}: `, env[pathVarName])

// env[pathVarName] = isWindows ? ".\\node_modules\\.bin": "./node_modules/.bin"

const run = (cmd, ...params) => {
	return childPromise(spawn(cmd, params.filter(p => p !== ""), {
	shell: true,
    env,
    cwd
})).then(console.log.bind(null, "ran"), console.log.bind(null,"threw"))}

if (isWindows) {
    await run('foo', "ohai", "5")
} else {
    await run('foojs',  "ohai", "5")
    await run('foo',  "ohai", "5")
}

console.log({env})