import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CopyCampaignComponent } from './copy-campaign.component';

describe('CopyCampaignComponent', () => {
  let component: CopyCampaignComponent;
  let fixture: ComponentFixture<CopyCampaignComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CopyCampaignComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CopyCampaignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
