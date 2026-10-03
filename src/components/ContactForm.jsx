import { useState } from 'react'
// Edge cases: form controls of many shapes, label-vs-input targets, toggle state
export default function ContactForm() {
  const [on, setOn] = useState(false)
  return (
    <section className="section" data-component="ContactForm">
      <h2>Form</h2>
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <label>Name<input placeholder="Ada Lovelace" data-component="NameInput" /></label>
        <label>Email<input type="email" placeholder="ada@example.com" data-component="EmailInput" /></label>
        <label>Plan<select data-component="PlanSelect"><option>Free</option><option>Pro</option><option>BYOK</option></select></label>
        <label className="row"><input type="checkbox" data-component="TermsCheckbox" /> I agree to the terms</label>
        <div className="row" data-component="RadioGroup">
          <label className="row"><input type="radio" name="r" defaultChecked data-component="Radio-A" /> A</label>
          <label className="row"><input type="radio" name="r" data-component="Radio-B" /> B</label>
        </div>
        <button type="button" className={on ? 'toggle on' : 'toggle'} onClick={() => setOn(!on)} data-component="Toggle" aria-pressed={on}>
          <span className="knob" />
        </button>
        <label>Volume<input type="range" data-component="VolumeSlider" /></label>
        <label>Message<textarea rows="3" placeholder="Say something…" data-component="MessageInput" /></label>
        <button className="btn danger" data-component="SubmitButton">Submit</button>
      </form>
    </section>
  )
}
