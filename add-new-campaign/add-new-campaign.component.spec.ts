import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddNewCampaignComponent } from './add-new-campaign.component';

describe('AddNewCampaignComponent', () => {
  let component: AddNewCampaignComponent;
  let fixture: ComponentFixture<AddNewCampaignComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddNewCampaignComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddNewCampaignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
