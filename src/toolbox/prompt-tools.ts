import { GluegunEnquirer, GluegunPrompt } from './prompt-types'

let enquirer: GluegunEnquirer = null
function getEnquirer(): GluegunEnquirer {
  if (enquirer) return enquirer

  const Enquirer: GluegunEnquirer = require('enquirer')
  enquirer = new Enquirer()

  return enquirer
}

/**
 * A yes/no question.
 *
 * @param message The message to display to the user.
 * @returns The true/false answer.
 */
const confirm = async (message: string, initial?: boolean): Promise<boolean> => {
  const { yesno } = await getEnquirer().prompt({
    name: 'yesno',
    type: 'confirm',
    message,
    initial,
  })
  return yesno
}

/**
 * We're replicating the interface of Enquirer in order to
 * "lazy load" the package only if and when we actually are asked for it.
 * This results in a significant speed increase.
 */
const prompt: GluegunPrompt = {
  confirm,
  ask: async (questions) => {
    if (Array.isArray(questions)) {
      // Because Enquirer 2 breaks backwards compatility (and we don't want to)
      // we are translating the previous API to the current equivalent.
      questions = questions.map((q) => {
        // if q is a function, run it to get the actual question object
        if (typeof q === 'function') q = q()

        if (q.type === 'rawlist' || q.type === 'list') q.type = 'select'
        if (q.type === 'expand') q.type = 'autocomplete'
        if (q.type === 'checkbox') q.type = 'multiselect'
        if (q.type === 'radio') q.type = 'select'
        if (q.type === 'question') q.type = 'input'
        return q
      })
    }
    return getEnquirer().prompt(questions)
  },
  separator: () => getEnquirer().separator(),
}

export { prompt, GluegunPrompt }
