import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const isAwake = atom({ plugin: 'lid-awake', key: 'isAwake' } as const, false)

const PMSET = '/usr/bin/pmset'
const WHO = 'lid-awake'

type Os = 'mac' | 'linux' | 'windows'

let os: Os | undefined
// Windows: the lid actions to restore (1 = sleep) when the toggle goes off.
let prevAc = '1'
let prevDc = '1'

async function detect($: any): Promise<Os> {
  if (os) return os
  try {
    const { stdout } = await $.process.run(['uname', '-s'], { timeoutMs: 5000 })
    if (/^Darwin/i.test(stdout)) os = 'mac'
    else if (/^Linux/i.test(stdout)) os = 'linux'
    else os = 'windows' // MINGW / MSYS / Cygwin
  } catch {
    os = 'windows' // no uname at all
  }
  return os
}

// The machine's real state: is the lid kept from sleeping the computer?
async function isOn($: any): Promise<boolean> {
  const system = await detect($)
  try {
    if (system === 'mac') {
      const { stdout } = await $.process.run([PMSET, '-g'], { timeoutMs: 5000 })
      return /SleepDisabled\s+1/.test(stdout)
    }
    if (system === 'linux') {
      const { stdout } = await $.process.run(['systemd-inhibit', '--list'], { timeoutMs: 5000 })
      return stdout.includes(WHO)
    }
    const { stdout } = await $.process.run(
      ['powercfg', '/query', 'SCHEME_CURRENT', 'SUB_BUTTONS', 'LIDACTION'],
      { timeoutMs: 5000 },
    )
    const ac = /Current AC Power Setting Index:\s*0x([0-9a-f]+)/i.exec(stdout)
    const dc = /Current DC Power Setting Index:\s*0x([0-9a-f]+)/i.exec(stdout)
    return ac !== null && dc !== null && Number.parseInt(ac[1], 16) === 0 && Number.parseInt(dc[1], 16) === 0
  } catch {
    return false
  }
}

// Turn the lid-awake mode on or off; resolves an error message, or null on success.
async function set($: any, value: boolean): Promise<string | null> {
  const system = await detect($)
  try {
    if (system === 'mac') {
      const { exitCode, stderr } = await $.process.run(
        ['sudo', '-n', PMSET, '-a', 'disablesleep', value ? '1' : '0'],
        { timeoutMs: 10000 },
      )
      if (exitCode !== 0) return `${stderr.trim() || `exit ${exitCode}`} (macOS needs the sudoers rule from the README)`
    } else if (system === 'linux') {
      // Always drop an old inhibitor first, so two never pile up.
      await $.process.run(['pkill', '-f', `systemd-inhibit.*--who=${WHO}`], { timeoutMs: 5000 })
      if (value) {
        // A long-lived child that holds the lid switch until it is killed.
        void (async () => {
          const child = $.process.spawn({
            argv: [
              'systemd-inhibit', '--what=handle-lid-switch', `--who=${WHO}`,
              '--why=Claude Code session running', '--mode=block', 'sleep', 'infinity',
            ],
          })
          for await (const _ of child) {
            // no output expected; the loop ends when the child is killed
          }
        })()
        await $.process.run(['sleep', '0.3'], { timeoutMs: 5000 })
        if (!(await isOn($))) return 'systemd-inhibit could not hold the lid switch'
      }
    } else {
      if (value) {
        const { stdout } = await $.process.run(
          ['powercfg', '/query', 'SCHEME_CURRENT', 'SUB_BUTTONS', 'LIDACTION'],
          { timeoutMs: 5000 },
        )
        const ac = /Current AC Power Setting Index:\s*0x([0-9a-f]+)/i.exec(stdout)
        const dc = /Current DC Power Setting Index:\s*0x([0-9a-f]+)/i.exec(stdout)
        if (ac && Number.parseInt(ac[1], 16) !== 0) prevAc = String(Number.parseInt(ac[1], 16))
        if (dc && Number.parseInt(dc[1], 16) !== 0) prevDc = String(Number.parseInt(dc[1], 16))
      }
      const ac = value ? '0' : prevAc
      const dc = value ? '0' : prevDc
      for (const args of [
        ['/setacvalueindex', 'SCHEME_CURRENT', 'SUB_BUTTONS', 'LIDACTION', ac],
        ['/setdcvalueindex', 'SCHEME_CURRENT', 'SUB_BUTTONS', 'LIDACTION', dc],
        ['/setactive', 'SCHEME_CURRENT'],
      ]) {
        const { exitCode, stderr } = await $.process.run(['powercfg', ...args], { timeoutMs: 10000 })
        if (exitCode !== 0) return stderr.trim() || `powercfg exit ${exitCode}`
      }
    }
  } catch (error) {
    return String(error)
  }
  await update($, isAwake, () => value)
  return null
}

export const register: Register = on => {
  // Start from the machine's real state, not a guess.
  on('session.start', async ($, e, next) => {
    const isOnNow = await isOn($)
    await update($, isAwake, () => isOnNow)
    return next(e)
  })

  // Closing the session restores normal sleep.
  on('session.end', async ($, e, next) => {
    if (await read($, isAwake)) await set($, false)
    return next(e)
  })

  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const awake = await read($, isAwake)

    const toggle = async () => {
      const error = await set($, !awake)
      if (error) {
        $.ui.toast(`lid-awake: ${error}`)
      } else {
        $.ui.toast(
          awake ? 'Lid sleep allowed again' : 'Staying awake with the lid closed',
        )
      }
    }

    // Leave the engine's mode labels and other plugins' items as they are,
    // and draw the button just to their left.
    const beneath = await next(e)
    const hasBeneath = e.props.modes.length > 0 || beneath != null

    return (
      <Box flexDirection="row">
        <Button
          key="lid"
          plain
          dimColor
          label={awake ? '☀ lid awake' : '☾ lid sleeps'}
          onPress={toggle}
        />
        {hasBeneath ? <Text dimColor>{' · '}</Text> : null}
        {beneath}
      </Box>
    )
  })
}
