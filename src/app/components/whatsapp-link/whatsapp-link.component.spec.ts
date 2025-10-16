import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhatsappLinkComponent } from './whatsapp-link.component';

describe('WhatsappLinkComponent', () => {
  let component: WhatsappLinkComponent;
  let fixture: ComponentFixture<WhatsappLinkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WhatsappLinkComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WhatsappLinkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have the correct WhatsApp number', () => {
    expect(component.whatsappNumber).toBe('918106811285');
  });

  it('should have a message', () => {
    expect(component.message).toBe('Hi I am interested!');
  });

  it('should create the correct WhatsApp URL', () => {
    const expectedUrl = 'https://wa.me/918106811285?text=Hi%20I%20am%20interested!';
    expect(component.whatsappUrl).toBe(expectedUrl);
  });
});