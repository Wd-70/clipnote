'use client';

import { motion } from 'motion/react';
import { 
  ArrowRight, 
  Scissors, 
  Sparkles, 
  Zap, 
  FileVideo, 
  CheckCircle2, 
  Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 50 } },
};

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" as const },
  transition: { duration: 0.8, ease: "easeOut" as const }
};

export default function LandingPage() {
  const t = useTranslations('landing');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');

  const features = [
    {
      icon: Wand2,
      title: t('feature1Title'),
      desc: t('feature1Desc')
    },
    {
      icon: FileVideo,
      title: t('feature2Title'),
      desc: t('feature2Desc')
    },
    {
      icon: Scissors,
      title: t('feature3Title'),
      desc: t('feature3Desc')
    },
    {
      icon: Zap,
      title: t('feature4Title'),
      desc: t('feature4Desc')
    }
  ];

  const steps = [
    {
      step: "01",
      title: t('step1Title'),
      desc: t('step1Desc')
    },
    {
      step: "02",
      title: t('step2Title'),
      desc: t('step2Desc')
    },
    {
      step: "03",
      title: t('step3Title'),
      desc: t('step3Desc')
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <Scissors size={18} />
            </div>
            ClipNote
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">{tNav('features')}</Link>
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">{tNav('howItWorks')}</Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">{tNav('pricing')}</Link>
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="default" size="sm" className="hidden sm:flex px-4" asChild>
              <Link href="/dashboard">{t('getStartedFree')}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-4 overflow-hidden">
          {/* Abstract Background */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-blue-500/5 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto max-w-5xl text-center">
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="flex flex-col items-center gap-6"
            >
              <motion.div variants={item}>
                <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
                  <Sparkles className="w-3.5 h-3.5 mr-2 text-primary fill-primary/20" />
                  {t('badge')}
                </Badge>
              </motion.div>
              
              <motion.h1 variants={item} className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
                {t('heroTitle1')}<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
                  {t('heroTitle2')}
                </span>
              </motion.h1>
              
              <motion.p variants={item} className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
                {t('heroDescription')}
              </motion.p>

              <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
                <Button size="lg" className="h-14 px-10 text-lg rounded-full shadow-lg shadow-primary/20 group" asChild>
                  <Link href="/dashboard">
                    {t('getStartedFree')} 
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full" asChild>
                  <Link href="#how-it-works">
                    {t('watchDemo')}
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div 
              initial={fadeInUp.initial}
              whileInView={fadeInUp.whileInView}
              viewport={fadeInUp.viewport}
              transition={fadeInUp.transition}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('whyClipNote')}</h2>
              <p className="text-lg text-muted-foreground">{t('whyClipNoteDesc')}</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                >
                  <Card className="h-full border-muted hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                        <feature.icon size={24} />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {feature.desc}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="py-24">
          <div className="container mx-auto px-4">
            <motion.div 
              initial={fadeInUp.initial}
              whileInView={fadeInUp.whileInView}
              viewport={fadeInUp.viewport}
              transition={fadeInUp.transition}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('howItWorksTitle')}</h2>
              <p className="text-lg text-muted-foreground">{t('howItWorksDesc')}</p>
            </motion.div>

            <div className="relative max-w-4xl mx-auto">
              {/* Connecting Line (Desktop) */}
              <div className="hidden md:block absolute top-12 left-10 right-10 h-0.5 bg-gradient-to-r from-muted via-primary/30 to-muted z-0" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                {steps.map((stepItem, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.2, duration: 0.5 }}
                    className="flex flex-col items-center text-center bg-background p-6 rounded-2xl border border-border shadow-sm"
                  >
                    <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-3xl font-bold text-primary mb-6 shadow-inner ring-8 ring-background">
                      {stepItem.step}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{stepItem.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{stepItem.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
             <motion.div 
              initial={fadeInUp.initial}
              whileInView={fadeInUp.whileInView}
              viewport={fadeInUp.viewport}
              transition={fadeInUp.transition}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('pricingTitle')}</h2>
              <p className="text-lg text-muted-foreground">{t('pricingDesc')}</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Tier */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Card className="h-full border-muted p-6 flex flex-col">
                  <CardHeader className="p-0 mb-8">
                    <Badge variant="outline" className="w-fit mb-4">{t('starterPlan')}</Badge>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{t('starterPrice')}</span>
                      <span className="text-muted-foreground">{t('starterPriceUnit')}</span>
                    </div>
                    <CardDescription className="mt-2 text-base">
                      {t('starterDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1">
                    <ul className="space-y-4 mb-8">
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                        <span>{t('starterFeature1')}</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                        <span>{t('starterFeature2')}</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                        <span>{t('starterFeature3')}</span>
                      </li>
                    </ul>
                    <Button variant="outline" className="w-full h-12 text-lg" asChild>
                      <Link href="/dashboard">{t('getStartedFree')}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Pro Tier */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-b from-primary to-blue-600 opacity-20 blur-sm -z-10" />
                <Card className="h-full border-primary/20 p-6 flex flex-col bg-card/80 backdrop-blur-sm">
                  <CardHeader className="p-0 mb-8">
                    <Badge className="w-fit mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-0">{t('proPlan')}</Badge>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{t('proPrice')}</span>
                      <span className="text-muted-foreground">{t('proPriceUnit')}</span>
                    </div>
                    <CardDescription className="mt-2 text-base">
                      {t('proDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1">
                    <ul className="space-y-4 mb-8">
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span className="font-medium">{t('proFeature1')}</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span>{t('proFeature2')}</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span>{t('proFeature3')}</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span>{t('proFeature4')}</span>
                      </li>
                    </ul>
                    <Button className="w-full h-12 text-lg shadow-lg shadow-primary/20" asChild>
                      <Link href="/dashboard">{t('startPro')}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-4 relative overflow-hidden">
           <div className="absolute inset-0 bg-primary/5 -z-10" />
           <div className="container mx-auto text-center max-w-3xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                  {t('ctaTitle')}
                </h2>
                <p className="text-xl text-muted-foreground mb-10">
                  {t('ctaDesc')}
                </p>
                <Button size="lg" className="h-14 px-10 text-lg rounded-full" asChild>
                  <Link href="/dashboard">
                    {t('ctaButton')}
                  </Link>
                </Button>
              </motion.div>
           </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-bold text-foreground">
             <Scissors size={16} />
             ClipNote
          </div>
          <p>{t('copyright')}</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-foreground">{tCommon('terms')}</Link>
            <Link href="#" className="hover:text-foreground">{tCommon('privacy')}</Link>
            <Link href="#" className="hover:text-foreground">{tCommon('contact')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
