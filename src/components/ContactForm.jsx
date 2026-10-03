import { useState } from 'react'
// Edge cases: form controls of many shapes, label-vs-input targets, toggle state
export default function ContactForm() {
  const [on, setOn] = useState(false)
  return (
    <section className="section" data-component="ContactForm">
      <h2>Form</h2>
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <label>Name<input placeholder="Ada Lovelace" /></label>
        <label>Email<input type="email" placeholder="ada@example.com" /></label>
        <label>Plan<select><option>Free</option><option>Pro</option><option>BYOK</option></select></label>
        <label className="row"><input type="checkbox" /> I agree to the terms</label>
        <div className="row" data-component="RadioGroup">
          <label className="row"><input type="radio" name="r" defaultChecked /> A</label>
          <label className="row"><input type="radio" name="r" /> B</label>
        </div>
        <button type="button" className={on ? 'toggle on' : 'toggle'} onClick={() => setOn(!on)} data-component="Toggle" aria-pressed={on}>
          <span className="knob" />
        </button>
        <label>Volume<input type="range" /></label>
        <label>Message<textarea rows="3" placeholder="Say something…" /></label>
        <button className="btn danger" data-component="SubmitButton">Submit</button>
      </form>
    </section>
  )
}
