import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-contact-us',
  templateUrl: './contact-us.component.html',
  styleUrls: ['./contact-us.component.scss']
})
export class ContactUsComponent implements OnInit {
  contactForm!: FormGroup;
  loading = false;
  success = '';
  error = '';

  constructor(private formBuilder: FormBuilder) { }

  ngOnInit(): void {
    this.contactForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  get f() { return this.contactForm.controls; }

  onSubmit(): void {
    if (this.contactForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    // Simulate form submission
    setTimeout(() => {
      this.success = 'Thank you for your message! We will get back to you soon.';
      this.loading = false;
      this.contactForm.reset();
    }, 2000);
  }

  goBack(): void {
    window.history.back();
  }
}
