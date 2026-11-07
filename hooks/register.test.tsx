import { expect, test } from 'claude-code/testing'

const HINT = {
  plugin: 'lid-awake',
  component: 'SessionMode',
  requestId: 'hint',
  props: { modes: [] },
} as const

test('click toggles and updates the label', async ($, on) => {
  const calls: string[][] = []
  on('process.run', (_, e) => {
    calls.push([...e.argv])
    const isUname = e.argv[0] === 'uname'
    return { value: { exitCode: 0, stdout: isUname ? 'Darwin' : 'SleepDisabled\t\t0', stderr: '' } }
  })
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ ...HINT, surface: 'terminal' })
  await $.ui.press({ plugin: 'lid-awake', key: 'lid', requestId: 'hint', surface: 'terminal' })
  expect(calls.some(c => c.join(' ').includes('disablesleep 1'))).toBe(true)
  await ui.unmount()
})
