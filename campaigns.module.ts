import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { downgradeComponent } from '@angular/upgrade/static';
import * as angular from 'angular';
import { ArchwizardModule } from 'angular-archwizard';
import { TooltipModule, CollapseModule, BsDropdownModule, ModalModule, ButtonsModule, PaginationModule, BsDatepickerModule, TimepickerModule } from 'ngx-bootstrap';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { NgSelectModule } from '@ng-select/ng-select';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AccountsModule } from '../accounts/accounts.module';

import { NgxSummernoteModule } from '../shared/ngx-summernote/ngx-summernote.module';
import { SharedModule } from '../shared/shared.module';
import { CampaignsListComponent } from './campaigns-list/campaigns-list.component';
import { AddNewCampaignComponent } from './add-new-campaign/add-new-campaign.component';
import { CampaignDetailsComponent } from './campaign-details/campaign-details.component';
import { CopyCampaignComponent } from './copy-campaign/copy-campaign.component';

@NgModule({
	declarations: [
		CampaignsListComponent,
		AddNewCampaignComponent,
		CampaignDetailsComponent,
		CopyCampaignComponent,
	],
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		NgSelectModule,
		SharedModule,
		FontAwesomeModule,
		ArchwizardModule,
		AccountsModule,
		NgxSummernoteModule,
		TabsModule.forRoot(),
		BsDropdownModule.forRoot(),
		CollapseModule.forRoot(),
		TooltipModule.forRoot(),
		ModalModule.forRoot(),
		ButtonsModule.forRoot(),
		PaginationModule.forRoot(),
		BsDatepickerModule.forRoot(),
		TimepickerModule.forRoot()
	],
	entryComponents: [
		CampaignsListComponent,
		AddNewCampaignComponent,
		CampaignDetailsComponent,
		CopyCampaignComponent
	]
})

export class CampaignsModule { 
	constructor() {
		angular.module('talentCubeAdminApp')
			.directive('campaignsListComponent', downgradeComponent({ component: CampaignsListComponent }))
			.directive('addNewCampaignComponent', downgradeComponent({ component: AddNewCampaignComponent }))
			.directive('campaignDetailsComponent', downgradeComponent({ component: CampaignDetailsComponent }))
			.directive('copyCampaignComponent', downgradeComponent({component: CopyCampaignComponent}));
			.directive('copyCampaignComponent', downgradeComponent({component: CopyyyCampaignComponent}));
	}
}
