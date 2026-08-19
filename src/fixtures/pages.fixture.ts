import { browserTest } from './browser.fixture';
import type { PageFixtures } from './types';
import { AdminPage } from '../ui/pages/adminPage';
import { DashboardPage } from '../ui/pages/dashboardPage';
import { LoginPage } from '../ui/pages/loginPage';
import { ProfilePage } from '../ui/pages/profilePage';
import { RegisterPage } from '../ui/pages/registerPage';
import { VacancyApplicationPage } from '../ui/pages/vacancyApplicationPage';

export const pagesTest = browserTest.extend<PageFixtures>({
  loginPage: async ({ page }, use) => {
    const model = new LoginPage(page);
    await model.open();
    await use(model);
  },

  registerPage: async ({ page }, use) => {
    const model = new RegisterPage(page);
    await model.open();
    await use(model);
  },

  vacancyPage: async ({ page }, use) => {
    const model = new VacancyApplicationPage(page);
    await model.open();
    await use(model);
  },

  dashboardPage: async ({ appContextFactory, resourceActor }, use) => {
    const context = await appContextFactory.create(resourceActor.session);
    try {
      const model = new DashboardPage(await context.newPage());
      await model.open();
      await use(model);
    } finally {
      await context.close();
    }
  },

  profilePage: async ({ appContextFactory, isolatedActor }, use) => {
    const context = await appContextFactory.create(isolatedActor.session);
    try {
      const model = new ProfilePage(await context.newPage());
      await model.open();
      await use(model);
    } finally {
      await context.close();
    }
  },

  readOnlyDashboardPage: async ({ appContextFactory, readOnlyActor }, use) => {
    const context = await appContextFactory.create(readOnlyActor.session);
    try {
      const model = new DashboardPage(await context.newPage());
      await model.open();
      await use(model);
    } finally {
      await context.close();
    }
  },

  readOnlyProfilePage: async ({ appContextFactory, readOnlyActor }, use) => {
    const context = await appContextFactory.create(readOnlyActor.session);
    try {
      const model = new ProfilePage(await context.newPage());
      await model.open();
      await use(model);
    } finally {
      await context.close();
    }
  },

  adminPage: async ({ appContextFactory, adminSession }, use) => {
    const context = await appContextFactory.create(adminSession);
    try {
      const model = new AdminPage(await context.newPage());
      await model.open();
      await use(model);
    } finally {
      await context.close();
    }
  },
});
